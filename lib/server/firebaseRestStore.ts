import type { RoomStore } from './roomStore';

export class RoomStorageError extends Error {
  readonly status = 503;
  readonly retryable = true;
  constructor() {
    super('ยังยืนยันผลการบันทึกไม่ได้ กรุณาลองคำขอเดิมอีกครั้ง');
    this.name = 'RoomStorageError';
  }
}

/**
 * RTDB conditional PUT is a compare-and-swap transaction. Reads bypass local
 * caches; HTTP 412 retries the pure update against fresh state. No offline SDK
 * queue can outlive a request and overwrite newer state.
 * https://firebase.google.com/docs/database/rest/save-data#section-conditional-requests
 */
export function createFirebaseRoomStore(options: {
  databaseURL: string; accessToken: () => Promise<string>; fetch?: typeof fetch;
  timeoutMs?: number; maxAttempts?: number; maxResponseBytes?: number;
}): RoomStore {
  const transport = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const urlFor = (path: string) => {
    const url = new URL(options.databaseURL);
    url.pathname = `${url.pathname.replace(/\/$/, '')}/${path.split('/').map(encodeURIComponent).join('/')}.json`;
    return url;
  };
  async function request(path: string, method: 'GET' | 'PUT', etag?: string, value?: unknown, deadline?: number) {
    const controller = new AbortController();
    const remaining = deadline === undefined ? timeoutMs : Math.min(timeoutMs, deadline - Date.now());
    if (remaining <= 0) throw new RoomStorageError();
    const timer = setTimeout(() => controller.abort(), remaining);
    try {
      const token = await Promise.race([
        options.accessToken(),
        new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(new RoomStorageError()), { once: true })),
      ]);
      const response = await transport(urlFor(path), {
        method, cache: 'no-store', signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
          ...(method === 'GET' ? { 'X-Firebase-ETag': 'true' } : { 'if-match': etag! }),
        },
        ...(method === 'PUT' ? { body: JSON.stringify(value) } : {}),
      });
      if (response.status === 412 && method === 'PUT') {
        await response.body?.cancel();
        return { conflict: true as const, value: null, etag: '' };
      }
      if (!response.ok) throw new RoomStorageError();
      let data: unknown;
      if (options.maxResponseBytes !== undefined) {
        const reader = response.body?.getReader();
        if (!reader) throw new RoomStorageError();
        const chunks: Uint8Array[] = [];
        let length = 0;
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          length += part.value.byteLength;
          if (length > options.maxResponseBytes) { await reader.cancel(); throw new RoomStorageError(); }
          chunks.push(part.value);
        }
        const bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
        data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      } else data = await response.json();
      const version = response.headers.get('etag');
      if (method === 'GET' && !version) throw new RoomStorageError();
      return { conflict: false as const, value: data, etag: version ?? '' };
    } catch {
      // A lost PUT response may already have committed; recover using identity.
      throw new RoomStorageError();
    } finally { clearTimeout(timer); }
  }
  return {
    async read(path) { return (await request(path, 'GET')).value; },
    async transact(path, update) {
      const deadline = Date.now() + timeoutMs * 2;
      for (let attempt = 0; attempt < (options.maxAttempts ?? 32); attempt++) {
        const current = await request(path, 'GET', undefined, undefined, deadline);
        const next = update(current.value);
        if (next.value === undefined) return next.result;
        const write = await request(path, 'PUT', current.etag, next.value, deadline);
        if (!write.conflict) return next.result;
      }
      throw new RoomStorageError();
    },
  };
}
