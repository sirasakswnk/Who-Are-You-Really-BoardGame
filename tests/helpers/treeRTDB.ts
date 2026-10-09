import { createFirebaseRoomStore } from '../../lib/server/firebaseRestStore';
import { firebaseRoundTrip } from './firebaseSerialization';

/** Hierarchical REST fixture: any descendant write invalidates the root ETag. */
export function treeRTDB(initial: unknown = null) {
  let root = firebaseRoundTrip(initial), version = 0, writes = 0, conflicts = 0;
  let beforePut: (() => void) | undefined;
  const read = (path: string) => {
    let value = root;
    for (const key of path.split('/').filter(Boolean)) value = (value as Record<string, unknown> | null)?.[key] ?? null;
    return structuredClone(value);
  };
  const put = (path: string, value: unknown) => {
    const parts = path.split('/').filter(Boolean);
    if (!parts.length) root = firebaseRoundTrip(value);
    else {
      const next = structuredClone(root ?? {}) as Record<string, unknown>;
      let node = next;
      for (const key of parts.slice(0, -1)) {
        node[key] ??= {};
        node = node[key] as Record<string, unknown>;
      }
      if (value === null) delete node[parts.at(-1)!]; else node[parts.at(-1)!] = value;
      root = firebaseRoundTrip(next);
    }
    version++;
  };
  const transport: typeof fetch = async (input, init) => {
    const path = new URL(String(input)).pathname.slice(1, -5).split('/').map(decodeURIComponent).join('/');
    const etag = `"${version}"`, value = read(path);
    if (init?.method === 'GET') { await Promise.resolve(); return Response.json(value, { headers: { etag } }); }
    const hook = beforePut; beforePut = undefined; hook?.();
    if (new Headers(init?.headers).get('if-match') !== `"${version}"`) {
      conflicts++; return Response.json(read(path), { status: 412, headers: { etag: `"${version}"` } });
    }
    put(path, JSON.parse(String(init?.body))); writes++;
    return Response.json(read(path));
  };
  return { read, put, beforePut: (hook: () => void) => { beforePut = hook; },
    store: () => createFirebaseRoomStore({ databaseURL: 'https://fixture.invalid', accessToken: async () => 'fixture', fetch: transport }),
    get writes() { return writes; }, get conflicts() { return conflicts; },
  };
}
