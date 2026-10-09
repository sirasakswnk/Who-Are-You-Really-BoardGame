import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoomService } from '../../lib/server/roomService';
import * as roomStore from '../../lib/server/roomStore';
import { decodeRoomRecord } from '../../lib/server/roomSchema';
import { ROOM_TTL } from '../../lib/server/roomMaintenance';
import { adminAuth } from '../../lib/firebase/admin';
import { verifyAuthToken } from '../../lib/server/auth';
import { RoomSession } from '../../lib/client/roomSession';
import { createRoomApi } from '../../lib/client/roomApi';
import { POST as createRoute } from '../../app/api/room/create/route';
import { POST as joinRoute } from '../../app/api/room/join/route';
import { POST as readyRoute } from '../../app/api/room/ready/route';
import { POST as startRoute } from '../../app/api/room/start/route';
import { POST as leaveRoute } from '../../app/api/room/leave/route';
import { POST as actionRoute } from '../../app/api/game/action/route';
import { GET as getRoute } from '../../app/api/room/[code]/route';
import { fakeRTDB } from '../helpers/fakeRTDB';
import { tabStorage } from '../helpers/clientSnapshot';

afterEach(() => vi.restoreAllMocks());
async function fixture() {
  const db = fakeRTDB(); let now = ROOM_TTL * 2;
  const service = createRoomService(db.store(), { clock: () => now, codeGenerator: () => 'ABC234' });
  const requestId = randomUUID(); const { code } = await service.createRoom('host', 'หนึ่ง', 'cat', requestId);
  const room = () => decodeRoomRecord(db.values.get(`rooms/${code}`), code)!;
  const context = () => ({ actionId: randomUUID(), matchId: room().public.matchId, roundId: room().public.roundId, clueIndex: room().public.clueIndex });
  const request = (body?: unknown, uid = 'host') => new Request('http://localhost/api/test', {
    method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer mock-token-${uid}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { db, service, code, requestId, room, context, request, advance: (time: number) => { now += time; } };
}

describe('F07 expiry policy and actual HTTP routes', () => {
  it('extends only accepted state changes; reads, reconnect/create replay, receipt replay and no-op ready do not renew', async () => {
    const f = await fixture(), initial = f.room().server.expiresAt;
    f.advance(1000);
    await f.service.getRoomProjections(f.code, 'host');
    await f.service.joinRoom(f.code, 'host', 'หนึ่ง', 'cat');
    await f.service.createRoom('host', 'หนึ่ง', 'cat', f.requestId);
    expect(f.room().server.expiresAt).toBe(initial);
    await f.service.joinRoom(f.code, 'guest', 'สอง', 'fox');
    expect(f.room().server.expiresAt).toBe(initial + 1000);
    const context = f.context(); await f.service.setPlayerReady(f.code, 'host', true, context);
    expect(f.room().server.expiresAt).toBe(initial + 1000);
    f.advance(1000); const before = f.room();
    await f.service.setPlayerReady(f.code, 'host', true, context);
    expect(f.room()).toEqual(before);
    await f.service.setPlayerReady(f.code, 'host', true, f.context());
    expect(f.room().server.expiresAt).toBe(before.server.expiresAt);
    expect((await f.service.dispatchGameAction(f.code, 'host', { ...f.context(), action: { type: 'ROLE_ACK' } })).success).toBe(false);
    expect(f.room().server.expiresAt).toBe(before.server.expiresAt);
    await f.service.setPlayerReady(f.code, 'guest', true, f.context()); await f.service.startMatch(f.code, 'host', f.context());
    expect(f.room().server.expiresAt).toBe(initial + 2000);
  });
  it('keeps opponent/public payload and revisions unchanged when secret ack renews the hidden expiry', async () => {
    const f = await fixture(); await f.service.joinRoom(f.code, 'guest', 'สอง', 'fox');
    await f.service.setPlayerReady(f.code, 'host', true, f.context()); await f.service.setPlayerReady(f.code, 'guest', true, f.context());
    await f.service.startMatch(f.code, 'host', f.context()); const before = f.room(); f.advance(5000);
    await f.service.dispatchGameAction(f.code, 'host', { ...f.context(), action: { type: 'ROLE_ACK' } });
    const after = f.room(); expect(after.server.expiresAt).toBe(before.server.expiresAt + 5000);
    expect(after.public).toEqual(before.public); expect(after.private.guest).toEqual(before.private.guest);
    expect(after.private.host.roleAcknowledged).toBe(true);
    expect(JSON.stringify((await f.service.getRoomProjections(f.code, 'guest')))).not.toContain('expiresAt');
  });
  it('denies reads, join, all commands and create replay at the exact expiry boundary without changing room', async () => {
    const f = await fixture(), before = f.room(), context = f.context(); f.advance(ROOM_TTL);
    await expect(f.service.getRoomProjections(f.code, 'host')).rejects.toMatchObject({ status: 410 });
    await expect(f.service.createRoom('host', 'หนึ่ง', 'cat', f.requestId)).rejects.toMatchObject({ status: 410 });
    for (const result of [await f.service.joinRoom(f.code, 'guest', 'สอง', 'fox'),
      await f.service.setPlayerReady(f.code, 'host', true, context), await f.service.startMatch(f.code, 'host', context),
      await f.service.leaveRoom(f.code, 'host', context),
      await f.service.dispatchGameAction(f.code, 'host', { ...context, action: { type: 'ROLE_ACK' } })]) {
      expect(result).toMatchObject({ success: false, error: 'Room expired', status: 410 });
    }
    expect(f.room()).toEqual(before);
  });
  it('rejects a request that expires while its rate-limit transaction is pending', async () => {
    const f = await fixture(), context = f.context(), before = f.room();
    f.db.onPut(path => { if (path.startsWith('requestLimits/')) f.advance(ROOM_TTL); });
    expect(await f.service.setPlayerReady(f.code, 'host', true, context)).toMatchObject({ success: false, status: 410 });
    expect(f.room()).toEqual(before);
  });
  it('never reduces expiry when a caller clock trails a prior renewal', async () => {
    const f = await fixture(); const raw = f.room(); raw.server.expiresAt += ROOM_TTL;
    f.db.put(`rooms/${f.code}`, raw); await f.service.setPlayerReady(f.code, 'host', true, f.context());
    expect(f.room().server.expiresAt).toBe(raw.server.expiresAt);
  });
  it('sets no-store on unauthorized responses from every room/game endpoint', async () => {
    for (const handler of [createRoute, joinRoute, readyRoute, startRoute, leaveRoute, actionRoute]) {
      const response = await handler(new Request('http://localhost/api/test', { method: 'POST' }));
      expect(response.status).toBe(401); expect(response.headers.get('cache-control')).toBe('no-store');
    }
    const response = await getRoute(new Request('http://localhost/api/room/ABC234'), { params: Promise.resolve({ code: 'ABC234' }) });
    expect(response.status).toBe(401); expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('returns no-store for successful reads, outsider/validation errors, and 410 from all expired-room HTTP routes', async () => {
    const f = await fixture(); vi.spyOn(roomStore, 'getRoomStore').mockImplementation(() => f.db.store());
    const raw = f.room(); raw.server.expiresAt = Date.now() + ROOM_TTL; f.db.put(`rooms/${f.code}`, raw);
    const read = (uid = 'host') => getRoute(f.request(undefined, uid), { params: Promise.resolve({ code: f.code }) });
    const valid = await read(); expect(valid.status).toBe(200); expect(valid.headers.get('cache-control')).toBe('no-store');
    const outsider = await read('outsider'); expect(outsider.status).toBe(403); expect(outsider.headers.get('cache-control')).toBe('no-store');
    const invalid = await readyRoute(f.request({ code: f.code, ready: 'invalid' })); expect(invalid.status).toBe(400); expect(invalid.headers.get('cache-control')).toBe('no-store');
    raw.server.expiresAt = Date.now() - 1; f.db.put(`rooms/${f.code}`, raw);
    const bodies: Array<[typeof readyRoute, unknown]> = [[readyRoute, { code: f.code, ready: true, ...f.context() }],
      [startRoute, { code: f.code, ...f.context() }], [leaveRoute, { code: f.code, ...f.context() }],
      [actionRoute, { code: f.code, ...f.context(), action: { type: 'ROLE_ACK' } }], [joinRoute, { code: f.code, displayName: 'หนึ่ง', avatarId: 'cat' }],
      [createRoute, { displayName: 'หนึ่ง', avatarId: 'cat', requestId: f.requestId }]];
    for (const [handler, body] of bodies) { const response = await handler(f.request(body)); expect(response.status).toBe(410); expect(response.headers.get('cache-control')).toBe('no-store'); }
    const expiredRead = await read(); expect(expiredRead.status).toBe(410); expect(expiredRead.headers.get('cache-control')).toBe('no-store');
  });
  it('blocks the client after a formerly valid room expires and reports a clear expiry message', async () => {
    const f = await fixture(); vi.spyOn(roomStore, 'getRoomStore').mockImplementation(() => f.db.store());
    const raw = f.room(); raw.server.expiresAt = Date.now() + ROOM_TTL; f.db.put(`rooms/${f.code}`, raw);
    const transport: typeof fetch = async (url, init) => getRoute(new Request(new URL(String(url), 'http://localhost'), init), { params: Promise.resolve({ code: f.code }) });
    const user = { uid: 'host', getIdToken: async () => 'mock-token-host' };
    const session = new RoomSession(f.code, 'host', createRoomApi(() => user, 'host', transport), tabStorage(), () => {});
    try {
      await session.start(); expect(session.state.actionBlocked).toBe(false);
      raw.server.expiresAt = Date.now() - 1; f.db.put(`rooms/${f.code}`, raw);
      await session.refresh(); expect(session.state.actionBlocked).toBe(true); expect(session.state.connectionError).toContain('หมดอายุ');
    } finally { session.dispose(); }
  });
  it('does not log rejected token contents or SDK exception payloads', async () => {
    vi.spyOn(adminAuth, 'verifyIdToken').mockRejectedValue(new Error('SECRET-TOKEN SDK detail'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await verifyAuthToken(new Request('http://localhost', { headers: { Authorization: 'Bearer SECRET-TOKEN' } }))).toBeNull();
    expect(log).toHaveBeenCalledWith('Failed to verify Firebase ID token');
    expect(JSON.stringify(log.mock.calls)).not.toContain('SECRET-TOKEN');
  });
});
