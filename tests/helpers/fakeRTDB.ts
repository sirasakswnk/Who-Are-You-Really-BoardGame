import { createFirebaseRoomStore } from '../../lib/server/roomStore';
import { firebaseRoundTrip } from './firebaseSerialization';

/** Independent transports sharing only a simulated server with real RTDB values. */
export function fakeRTDB() {
  const values = new Map<string, unknown>();
  const versions = new Map<string, number>();
  let conflicts = 0;
  let writes = 0;
  let roomWrites = 0;
  let rejectWrites = false;
  let loseResponseFor: string | null = null;
  let timeoutResponseFor: string | null = null;
  let forcedConflicts = 0;
  let forcedConflictPath = '';
  let onPut: ((path: string, value: unknown) => void) | null = null;
  const put = (path: string, value: unknown) => {
    values.set(path, firebaseRoundTrip(value));
    versions.set(path, (versions.get(path) ?? 0) + 1);
  };
  const transport: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname.slice(1, -5).split('/').map(decodeURIComponent).join('/');
    const version = `"${versions.get(path) ?? 0}"`;
    const value = structuredClone(values.get(path) ?? null);
    // GET captures a version before yielding, creating genuine stale CAS races.
    if (init?.method === 'GET') {
      await Promise.resolve();
      return Response.json(value, { headers: { etag: version } });
    }
    if (rejectWrites) return Response.json({ error: 'write failed' }, { status: 503 });
    const headers = new Headers(init?.headers);
    const forceConflict = forcedConflicts > 0 && path.startsWith(forcedConflictPath);
    if (forceConflict || headers.get('if-match') !== version) {
      if (forceConflict) forcedConflicts--;
      conflicts++;
      return Response.json(value, { status: 412, headers: { etag: version } });
    }
    const next = JSON.parse(String(init?.body));
    put(path, next);
    writes++;
    if (path.startsWith('rooms/')) roomWrites++;
    onPut?.(path, next);
    if (timeoutResponseFor === path) {
      timeoutResponseFor = null;
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('Response timeout after commit')), { once: true });
      });
    }
    if (loseResponseFor === path) {
      loseResponseFor = null;
      throw new Error('Response lost after commit');
    }
    return Response.json(values.get(path) ?? null);
  };
  return {
    values, put,
    store: (timeoutMs?: number) => createFirebaseRoomStore({ databaseURL: 'https://fake.invalid', accessToken: async () => 'test-only', fetch: transport, timeoutMs }),
    get conflicts() { return conflicts; }, get writes() { return writes; },
    get roomWrites() { return roomWrites; },
    rejectWrites(value: boolean) { rejectWrites = value; },
    loseResponse(path: string) { loseResponseFor = path; },
    timeoutResponse(path: string) { timeoutResponseFor = path; },
    forceConflicts(count: number, pathPrefix = '') { forcedConflicts = count; forcedConflictPath = pathPrefix; },
    onPut(callback: (path: string, value: unknown) => void) { onPut = callback; },
  };
}
