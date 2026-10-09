export interface PendingRoomCreate {
  uid: string; requestId: string; displayName: string; avatarId: string;
}
const KEY = 'wayr.pendingRoomCreate';
type StorageAccess = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function newRequestId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // LAN previews over HTTP may lack randomUUID; getRandomValues remains usable.
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), value => value.toString(16).padStart(2, '0')).join('');
}

/** Keep the original payload and identity until success or a definitive error. */
export function prepareRoomCreate(
  storage: StorageAccess | null,
  profile: Omit<PendingRoomCreate, 'requestId'>,
  current: PendingRoomCreate | null,
  newId: () => string = newRequestId
): PendingRoomCreate {
  if (current?.uid === profile.uid) return current;
  try {
    const saved = JSON.parse(storage?.getItem(KEY) ?? 'null');
    if (saved?.uid === profile.uid && typeof saved.requestId === 'string' &&
        /^[A-Za-z0-9_-]{1,128}$/.test(saved.requestId) && typeof saved.displayName === 'string' && typeof saved.avatarId === 'string') return saved;
  } catch { /* Storage can be unavailable; the component ref still preserves retries. */ }
  const pending = { ...profile, requestId: newId() };
  try { storage?.setItem(KEY, JSON.stringify(pending)); } catch { /* Keep in memory. */ }
  return pending;
}
export function clearRoomCreate(storage: StorageAccess | null): void {
  try { storage?.removeItem(KEY); } catch { /* The caller also clears its ref. */ }
}
