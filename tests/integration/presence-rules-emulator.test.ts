import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createMockUserToken } from '@firebase/util';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, connectDatabaseEmulator, onValue, ref, onDisconnect, set, goOffline } from 'firebase/database';

// Explicit local-only opt-in. No .env, credentials or live namespace is loaded.
const host = process.env.F05_RTDB_EMULATOR_HOST;
if (host && !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) throw new Error('F05 Rules tests require a loopback emulator');
const project = `mock-f05-${randomUUID()}`, base = `http://${host ?? '127.0.0.1:19243'}`;
const apps: FirebaseApp[] = [];
function request(path: string, method = 'GET', value?: unknown, uid = 'host', admin = false) {
  const url = new URL(`${base}/${path}.json`); url.searchParams.set('ns', project);
  if (!admin) url.searchParams.set('auth', createMockUserToken({ sub: uid, user_id: uid, iat: Math.floor(Date.now() / 1000) }, project));
  return fetch(url, { method, headers: admin ? { Authorization: 'Bearer owner' } : {},
    body: value === undefined ? undefined : JSON.stringify(value), signal: AbortSignal.timeout(5000) });
}
const seed = (expiresAt = Date.now() + 60_000) => request('rooms/ABC234', 'PUT', {
  members: { host: { seat: 0 }, guest: { seat: 1 } }, public: { phase: 'ANSWERING' },
  private: { host: { role: 'saver' }, guest: { role: 'comfort' } }, server: { expiresAt, secret: true },
}, 'host', true);

describe.skipIf(!host)('F05/F07 real RTDB presence and room expiry Rules', () => {
  beforeAll(async () => {
    const rules = JSON.parse(await readFile(new URL('../../database.rules.json', import.meta.url), 'utf8'));
    const response = await request('.settings/rules', 'PUT', rules, 'host', true);
    expect(response.ok).toBe(true);
  });
  afterAll(async () => { await Promise.all(apps.map(app => deleteApp(app))); await request('', 'DELETE', undefined, 'host', true); });
  it('permits member reads and own leaf writes, and denies opponent/non-member reads and writes', async () => {
    await seed();
    for (const path of ['members', 'public', 'private/host']) {
      expect((await request(`rooms/ABC234/${path}`)).ok).toBe(true);
      expect((await request(`rooms/ABC234/${path}`, 'GET', undefined, 'outsider')).ok).toBe(false);
    }
    for (const path of ['', 'rooms', 'rooms/ABC234', 'rooms/ABC234/private', 'requestLimits', 'roomCreationRequests']) {
      expect((await request(path)).ok).toBe(false);
      expect((await request(path, 'PUT', { unsafe: true })).ok).toBe(false);
    }
    expect((await request('presence/ABC234/host/tab-a', 'PUT', true)).ok).toBe(true);
    expect((await request('presence/ABC234')).ok).toBe(true);
    expect((await request('presence/ABC234', 'GET', undefined, 'outsider')).ok).toBe(false);
    expect((await request('presence/ABC234/guest/tab-a', 'PUT', true)).ok).toBe(false);
    expect((await request('presence/ABC234/outsider/tab-a', 'PUT', true, 'outsider')).ok).toBe(false);
    expect((await request('rooms/ABC234/server')).ok).toBe(false);
    expect((await request('rooms/ABC234/private/guest')).ok).toBe(false);
    expect((await request('rooms/ABC234/public', 'PUT', { phase: 'MATCH_RESULT' })).ok).toBe(false);
  });
  it('keeps the other tab online when deleting one connection and rejects malformed leaf values', async () => {
    await seed();
    await request('presence/ABC234/host/tab-a', 'PUT', true); await request('presence/ABC234/host/tab-b', 'PUT', true);
    expect((await request('presence/ABC234/host/tab-a', 'DELETE')).ok).toBe(true);
    const response = await request('presence/ABC234/host'); expect(await response.json()).toEqual({ 'tab-b': true });
    for (const value of [false, 'online', { online: true }]) {
      expect((await request('presence/ABC234/host/bad-value', 'PUT', value)).ok).toBe(false);
    }
  });
  it('permits owner cleanup after explicit leave while denying renewed online/private reads', async () => {
    await seed(); await request('presence/ABC234/host/tab-a', 'PUT', true);
    await request('rooms/ABC234/members/host', 'DELETE', undefined, 'host', true);
    expect((await request('presence/ABC234/host/tab-new', 'PUT', true)).ok).toBe(false);
    expect((await request('presence/ABC234')).ok).toBe(false);
    expect((await request('rooms/ABC234/private/host')).ok).toBe(false);
    expect((await request('presence/ABC234/host/tab-a', 'DELETE')).ok).toBe(true);
    expect((await request('presence/ABC234/guest/tab-b', 'DELETE')).ok).toBe(false);
  });
  it('denies online publication and reads after expiry but still permits own cleanup', async () => {
    await seed(Date.now() - 1000);
    for (const path of ['members', 'public', 'private/host']) expect((await request(`rooms/ABC234/${path}`)).ok).toBe(false);
    expect((await request('presence/ABC234/host/tab-a', 'PUT', true)).ok).toBe(false);
    expect((await request('presence/ABC234')).ok).toBe(false);
    expect((await request('presence/ABC234/host/tab-a', 'DELETE')).ok).toBe(true);
    await request('rooms/ABC234/server/expiresAt', 'PUT', Date.now() + 60_000, 'host', true);
    for (const path of ['members', 'public', 'private/host']) expect((await request(`rooms/ABC234/${path}`)).ok).toBe(true);
    expect((await request('rooms/ABC234/private/guest')).ok).toBe(false);
    expect((await request('presence/ABC234/host/tab-a', 'PUT', true)).ok).toBe(true);
  });
  it('executes server onDisconnect cleanup after membership removal while retaining the other tab connection', async () => {
    await seed();
    const databases = ['a', 'b'].map(id => {
      const app = initializeApp({ projectId: project, databaseURL: `${base}?ns=${project}` }, `f05-${id}-${project}`); apps.push(app);
      const db = getDatabase(app); const [hostname, port] = host!.split(':');
      connectDatabaseEmulator(db, hostname, Number(port), { mockUserToken: { sub: 'host', iat: Math.floor(Date.now() / 1000) } });
      return db;
    });
    for (const [index, db] of databases.entries()) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => { off(); reject(new Error('Local SDK connection timed out')); }, 5000);
        const off = onValue(ref(db, '.info/connected'), snapshot => {
          if (snapshot.val() === true) { clearTimeout(timeout); off(); resolve(); }
        });
      });
      const location = ref(db, `presence/ABC234/host/sdk-${index}`);
      await onDisconnect(location).remove(); await set(location, true);
    }
    await request('rooms/ABC234/members/host', 'DELETE', undefined, 'host', true);
    goOffline(databases[0]);
    const deadline = Date.now() + 5000;
    let remaining: Record<string, boolean> = {};
    do {
      const response = await request('presence/ABC234/host', 'GET', undefined, 'guest'); remaining = await response.json();
      if (!remaining['sdk-0']) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    } while (Date.now() < deadline);
    expect(remaining['sdk-0']).toBeUndefined(); expect(remaining['sdk-1']).toBe(true);
    goOffline(databases[1]);
  }, 20000);
});
