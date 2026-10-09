import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred } from '../helpers/clientSnapshot';

const mocks = vi.hoisted(() => ({
  auth: { currentUser: null as { uid: string } | null, authStateReady: vi.fn() }, signIn: vi.fn(),
}));
vi.mock('firebase/app', () => ({ initializeApp: () => ({}), getApps: () => [], getApp: () => ({}) }));
vi.mock('firebase/auth', () => ({ getAuth: () => mocks.auth, signInAnonymously: mocks.signIn, connectAuthEmulator: vi.fn() }));
vi.mock('firebase/database', () => ({ getDatabase: () => ({}), connectDatabaseEmulator: vi.fn() }));
import { ensureAnonymousAuth } from '../../lib/firebase/client';

beforeEach(() => { mocks.auth.currentUser = null; mocks.auth.authStateReady.mockReset().mockResolvedValue(undefined); mocks.signIn.mockReset(); });
describe('Anonymous session restoration', () => {
  it('shares initialization across Strict Mode and concurrent callers rather than making two actors', async () => {
    const ready = deferred<void>(), signIn = deferred<{ user: { uid: string } }>();
    mocks.auth.authStateReady.mockReturnValue(ready.promise); mocks.signIn.mockReturnValue(signIn.promise);
    const first = ensureAnonymousAuth(), second = ensureAnonymousAuth();
    expect(first).toBe(second); expect(mocks.signIn).not.toHaveBeenCalled();
    ready.resolve(); await Promise.resolve(); expect(mocks.signIn).toHaveBeenCalledOnce();
    signIn.resolve({ user: { uid: 'shared' } });
    expect((await first).uid).toBe('shared'); expect((await second).uid).toBe('shared');
  });
  it('waits for persistence restoration and keeps the existing actor', async () => {
    const ready = deferred<void>(); mocks.auth.authStateReady.mockReturnValue(ready.promise);
    const restored = ensureAnonymousAuth(); mocks.auth.currentUser = { uid: 'existing' }; ready.resolve();
    expect((await restored).uid).toBe('existing'); expect(mocks.signIn).not.toHaveBeenCalled();
  });
  it('allows recovery after initialization failed and reads the current actor on later calls', async () => {
    mocks.signIn.mockRejectedValueOnce(new Error('offline'));
    await expect(ensureAnonymousAuth()).rejects.toThrow('offline');
    mocks.auth.currentUser = { uid: 'restored' }; expect((await ensureAnonymousAuth()).uid).toBe('restored');
    mocks.auth.currentUser = { uid: 'changed' }; expect((await ensureAnonymousAuth()).uid).toBe('changed');
  });
});
