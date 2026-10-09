import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { cleanupRooms, planRoomCleanup, ROOM_TTL, RATE_RECORD_RETENTION_MS } from '../../lib/server/roomMaintenance';
import { createFirebaseRoomStore } from '../../lib/server/firebaseRestStore';
import { treeRTDB } from '../helpers/treeRTDB';

const cutoff = ROOM_TTL * 3, code = 'ABC234', activeCode = 'DEF567';
const room = (expiresAt: number, matchId = 'fixture-match') => ({ code, server: { expiresAt, gameState: { roomId: code, matchId } } });
const oldLimit = 'a'.repeat(64), activeLimit = 'b'.repeat(64), request = 'c'.repeat(64), orphanRequest = 'd'.repeat(64);
const fixture = () => ({
  rooms: { [code]: room(cutoff), [activeCode]: { code: activeCode, server: { expiresAt: cutoff + ROOM_TTL, gameState: { roomId: activeCode, matchId: 'active' } } } },
  presence: { [code]: { host: { tab: true } }, [activeCode]: { guest: { tab: true } }, GHK789: { gone: { tab: true } } },
  requestLimits: { [oldLimit]: { windowStart: cutoff - RATE_RECORD_RETENTION_MS, count: 1 }, [activeLimit]: { windowStart: cutoff - 60_000, count: 1 } },
  roomCreationRequests: { [request]: { code: activeCode, createdAt: 1, fingerprint: 'secret-fingerprint' }, [orphanRequest]: { code: 'JKM234', createdAt: 1, fingerprint: 'secret-fingerprint' } },
  unrelated: { preserve: true },
});

describe('F07 bounded atomic room maintenance', () => {
  it('dry-run reports paths only and performs no transaction or writes', async () => {
    const db = treeRTDB(fixture()), before = db.read('');
    const store = db.store(); store.transact = async () => { throw new Error('Dry-run attempted a transaction'); };
    const report = await cleanupRooms(store, { cutoff });
    expect(report.candidates).toHaveLength(4); expect(report.removed).toEqual([]);
    expect(JSON.stringify(report)).not.toContain('secret-fingerprint');
    expect(db.read('')).toEqual(before); expect(db.writes).toBe(0);
  });
  it('atomically deletes expired room plus presence, orphan presence and old metadata while retaining active records', async () => {
    const db = treeRTDB(fixture()), report = await cleanupRooms(db.store(), { cutoff, apply: true });
    expect(report.removed).toHaveLength(5); expect(db.writes).toBe(1);
    expect(db.read(`rooms/${code}`)).toBeNull(); expect(db.read(`presence/${code}`)).toBeNull();
    expect(db.read(`presence/GHK789`)).toBeNull(); expect(db.read(`requestLimits/${oldLimit}`)).toBeNull();
    expect(db.read(`roomCreationRequests/${orphanRequest}`)).toBeNull();
    expect(db.read(`roomCreationRequests/${request}`)).toEqual(fixture().roomCreationRequests[request]);
    expect(db.read(`rooms/${activeCode}`)).toEqual(fixture().rooms[activeCode]);
    expect(db.read(`requestLimits/${activeLimit}`)).toEqual(fixture().requestLimits[activeLimit]);
    expect(db.read('unrelated')).toEqual({ preserve: true });
  });
  it('rechecks expiry after an actual root CAS conflict and preserves the extended room and presence', async () => {
    const db = treeRTDB(fixture());
    db.beforePut(() => db.put(`rooms/${code}/server/expiresAt`, cutoff + ROOM_TTL));
    const report = await cleanupRooms(db.store(), { cutoff, apply: true });
    expect(db.conflicts).toBe(1); expect(report.skipped).toBe(1);
    expect(db.read(`rooms/${code}/server/expiresAt`)).toBe(cutoff + ROOM_TTL);
    expect(db.read(`presence/${code}`)).toEqual(fixture().presence[code]);
  });
  it('keeps code-reused rooms, fresh rate counters and reservations modified between scan and deletion', async () => {
    const raw = fixture();
    raw.roomCreationRequests[orphanRequest].code = code;
    const db = treeRTDB(raw);
    db.beforePut(() => {
      db.put(`rooms/${code}`, room(cutoff + 1, 'new-match'));
      db.put(`requestLimits/${oldLimit}/windowStart`, cutoff);
      db.put(`roomCreationRequests/${orphanRequest}/createdAt`, cutoff);
      db.put('rooms/GHK789', { code: 'GHK789', server: { expiresAt: cutoff + 1, gameState: { roomId: 'GHK789', matchId: 'new' } } });
    });
    const report = await cleanupRooms(db.store(), { cutoff, apply: true });
    expect(report.removed).toEqual([]); expect(report.skipped).toBe(4); expect(db.writes).toBe(0);
    expect(db.read(`presence/${code}`)).not.toBeNull(); expect(db.read('presence/GHK789')).not.toBeNull();
  });
  it('skips missing or malformed expiry and fails closed for invalid options/root', () => {
    const raw = { rooms: { [code]: room(NaN), [activeCode]: { code: activeCode, server: { expiresAt: 1 } } }, presence: { [code]: { host: { tab: true } } } };
    expect(planRoomCleanup(raw, cutoff)).toEqual([]);
    for (const limit of [0, 501, 1.5]) expect(() => planRoomCleanup(fixture(), cutoff, limit)).toThrow();
    expect(() => planRoomCleanup([], cutoff)).toThrow(); expect(planRoomCleanup(null, cutoff)).toEqual([]);
  });
  it('bounds each pass and can repeat safely without deleting unrelated data', async () => {
    const db = treeRTDB(fixture());
    const first = await cleanupRooms(db.store(), { cutoff, apply: true, limit: 1 });
    expect(first.candidates).toHaveLength(1); expect(first.removed).toHaveLength(2);
    await cleanupRooms(db.store(), { cutoff, apply: true });
    const last = await cleanupRooms(db.store(), { cutoff, apply: true });
    expect(last.candidates).toEqual([]); expect(db.read('unrelated')).toEqual({ preserve: true });
  });
  it('rejects oversized root reads before writing', async () => {
    let writes = 0;
    const fetcher: typeof fetch = async (_url, init) => {
      if (init?.method === 'PUT') writes++;
      return Response.json(fixture(), { headers: { etag: '"1"' } });
    };
    const store = createFirebaseRoomStore({ databaseURL: 'https://fixture.invalid', accessToken: async () => 'fake', fetch: fetcher, maxResponseBytes: 20 });
    await expect(cleanupRooms(store, { cutoff, apply: true })).rejects.toThrow(); expect(writes).toBe(0);
  });
  it('runs the CLI on a read-only fixture without credentials and rejects apply/unknown flags', () => {
    const dir = mkdtempSync(join(tmpdir(), 'f07-fixture-')), file = join(dir, `${randomUUID()}.json`);
    try {
      writeFileSync(file, JSON.stringify(fixture())); const before = readFileSync(file, 'utf8');
      const run = (...args: string[]) => execFileSync(process.execPath, ['scripts/cleanup-rooms.mjs', ...args], { encoding: 'utf8', stdio: 'pipe' });
      expect(run('--help')).toContain('Default: read-only dry-run');
      const report = JSON.parse(run('--fixture', file)); expect(report.mode).toBe('dry-run'); expect(report.removed).toEqual([]);
      expect(readFileSync(file, 'utf8')).toBe(before); expect(JSON.stringify(report)).not.toContain('secret-fingerprint');
      expect(() => run('--fixture', file, '--apply')).toThrow(); expect(() => run('--unknown')).toThrow();
      expect(() => run('--project', 'fake-project', '--database-url', 'https://fake-project.firebaseio.com', '--apply')).toThrow();
    } finally { unlinkSync(file); rmdirSync(dir); }
  });
});
