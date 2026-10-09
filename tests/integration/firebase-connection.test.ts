import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, connectAuthEmulator } from 'firebase/auth';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin, type App } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { acceptanceEnv } from '../helpers/acceptanceEnv';

// No dotenv, live credentials or shared _health_check/ping write during npm test.
const enabled = process.env.F08_ACCEPTANCE === 'emulator';
const target = enabled ? acceptanceEnv() : null;
let client: FirebaseApp, admin: App;
describe.skipIf(!enabled)('F08 isolated Auth/RTDB emulator connectivity', () => {
  beforeAll(() => {
    client = initializeApp({ projectId: target!.project, apiKey: 'emulator-only', authDomain: `${target!.project}.firebaseapp.com` }, `f08-client-${randomUUID()}`);
    connectAuthEmulator(getAuth(client), `http://${target!.authHost}`, { disableWarnings: true });
    admin = initializeAdmin({ projectId: target!.project, databaseURL: target!.databaseURL.toString() }, `f08-admin-${randomUUID()}`);
  });
  afterAll(async () => { await Promise.all([deleteApp(client), deleteAdmin(admin)]); });
  it('targets the explicit loopback demo project without production credentials', () => {
    expect(target!.project).toMatch(/^demo-f08-/); expect(target!.databaseURL.hostname).toMatch(/^(127\.0\.0\.1|localhost)$/);
  });
  it('signs in anonymously through the real SDK and verifies that token with Admin', async () => {
    const { user } = await signInAnonymously(getAuth(client)); expect(user.isAnonymous).toBe(true);
    const decoded = await getAdminAuth(admin).verifyIdToken(await user.getIdToken()); expect(decoded.uid).toBe(user.uid);
  }, 15_000);
  it('writes, reads and removes a unique probe in the isolated namespace', async () => {
    const location = getDatabase(admin).ref(`_acceptance/${randomUUID()}`);
    const value = { timestamp: Date.now(), marker: 'local-emulator-only' };
    try { await location.set(value); expect((await location.get()).val()).toEqual(value); }
    finally { await location.remove(); }
    expect((await location.get()).exists()).toBe(false);
  }, 15_000);
});
