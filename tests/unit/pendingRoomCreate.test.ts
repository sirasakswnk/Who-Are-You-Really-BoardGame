import { describe, expect, it, vi } from 'vitest';
import { prepareRoomCreate, clearRoomCreate } from '../../lib/client/pendingRoomCreate';

describe('Pending room create identity', () => {
  const profile = { uid: 'host', displayName: 'หนึ่ง', avatarId: 'cat' };
  it('preserves identity and original payload across retries and reloads', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
    const first = prepareRoomCreate(storage, profile, null, () => 'first-id');
    expect(prepareRoomCreate(storage, { ...profile, displayName: 'changed' }, first)).toEqual(first);
    expect(prepareRoomCreate(storage, profile, null, () => 'different-id')).toEqual(first);
    clearRoomCreate(storage);
    expect(prepareRoomCreate(storage, profile, null, () => 'new-id').requestId).toBe('new-id');
  });
  it('retains retries when storage is unavailable and isolates different users', () => {
    const first = prepareRoomCreate(null, profile, null, () => 'first-id');
    expect(prepareRoomCreate(null, profile, first)).toEqual(first);
    expect(prepareRoomCreate(null, { ...profile, uid: 'guest' }, first, () => 'guest-id').requestId).toBe('guest-id');
  });
  it('generates a random identity on HTTP LAN previews without randomUUID', () => {
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(7) });
    try { expect(prepareRoomCreate(null, profile, null).requestId).toBe('07'.repeat(16)); }
    finally { vi.unstubAllGlobals(); }
  });
});
