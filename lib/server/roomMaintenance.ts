import type { RoomStore } from './roomStore';

export const ROOM_TTL = 24 * 60 * 60 * 1000;
export const RATE_WINDOW_MS = 60_000;
export const RATE_RECORD_RETENTION_MS = ROOM_TTL;

type ObjectData = Record<string, unknown>;
type Bucket = 'rooms' | 'presence' | 'requestLimits' | 'roomCreationRequests';
export interface CleanupCandidate { bucket: Bucket; key: string; binding: string }
export interface CleanupReport {
  mode: 'dry-run' | 'apply'; cutoff: number; candidates: Array<{ bucket: Bucket; key: string }>;
  removed: Array<{ bucket: Bucket; key: string }>; skipped: number;
}
const object = (value: unknown): ObjectData | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as ObjectData : null;
const timestamp = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const codePattern = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
const hashPattern = /^[a-f0-9]{64}$/;
const bucketData = (root: ObjectData, bucket: Bucket): ObjectData => object(root[bucket]) ?? {};

function roomMetadata(value: unknown, code: string) {
  const room = object(value), server = object(room?.server), state = object(server?.gameState);
  if (room?.code !== code || !timestamp(server?.expiresAt) || state?.roomId !== code ||
      typeof state.matchId !== 'string' || !state.matchId.length) return null;
  return { expiresAt: server.expiresAt, matchId: state.matchId };
}
function binding(root: ObjectData, bucket: Bucket, key: string, cutoff: number): string | null {
  const value = bucketData(root, bucket)[key], item = object(value);
  if (bucket === 'rooms') {
    const room = roomMetadata(value, key);
    return codePattern.test(key) && room && room.expiresAt <= cutoff ? room.matchId : null;
  }
  if (bucket === 'presence') {
    // Orphans only; room-associated presence is deleted with its room below.
    return codePattern.test(key) && item && !Object.hasOwn(bucketData(root, 'rooms'), key) ? 'orphan' : null;
  }
  if (!hashPattern.test(key) || !item) return null;
  if (bucket === 'requestLimits') {
    return timestamp(item.windowStart) && Number.isSafeInteger(item.count) && Number(item.count) >= 0 &&
      item.windowStart + RATE_RECORD_RETENTION_MS <= cutoff ? JSON.stringify(item) : null;
  }
  if (!timestamp(item.createdAt) || item.createdAt + ROOM_TTL > cutoff ||
      typeof item.fingerprint !== 'string' || typeof item.code !== 'string' || !codePattern.test(item.code)) return null;
  const rooms = bucketData(root, 'rooms');
  // Keep reservations for active rooms, and conservatively keep malformed rooms.
  if (Object.hasOwn(rooms, item.code)) {
    const room = roomMetadata(rooms[item.code], item.code);
    if (!room || room.expiresAt > cutoff) return null;
  }
  return JSON.stringify(item);
}

/** Read-only bounded deletion plan; payloads and credentials never enter the report. */
export function planRoomCleanup(raw: unknown, cutoff: number, limit = 100): CleanupCandidate[] {
  if (!timestamp(cutoff) || !Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error('Invalid cleanup options');
  if (raw === null) return [];
  const root = object(raw);
  if (!root) throw new Error('Invalid database root');
  const candidates: CleanupCandidate[] = [];
  for (const bucket of ['rooms', 'presence', 'requestLimits', 'roomCreationRequests'] as const) {
    for (const key of Object.keys(bucketData(root, bucket)).sort()) {
      const eligible = binding(root, bucket, key, cutoff);
      if (eligible !== null) candidates.push({ bucket, key, binding: eligible });
      if (candidates.length >= limit) return candidates;
    }
  }
  return candidates;
}

/**
 * Root ETag CAS rechecks all candidates and atomically removes room + presence.
 * Any room action/creation/rate update invalidates a stale root ETag. A separate
 * presence deletion would race with room-code reuse, so it is never used here.
 * This manual tool is for small databases; the REST caller must bound read size.
 */
export async function cleanupRooms(store: RoomStore, options: { cutoff: number; apply?: boolean; limit?: number }): Promise<CleanupReport> {
  const { cutoff } = options;
  const candidates = planRoomCleanup(await store.read(''), cutoff, options.limit);
  const report: CleanupReport = { mode: options.apply ? 'apply' : 'dry-run', cutoff,
    candidates: candidates.map(({ bucket, key }) => ({ bucket, key })), removed: [], skipped: 0 };
  if (!options.apply || !candidates.length) return report;
  return store.transact('', raw => {
    const current = object(raw) ?? {};
    const next = { ...current };
    const removed: CleanupReport['removed'] = [];
    const remove = (bucket: Bucket, key: string) => {
      const entries = { ...bucketData(next, bucket) };
      if (!Object.hasOwn(entries, key)) return;
      delete entries[key];
      if (Object.keys(entries).length) next[bucket] = entries;
      else delete next[bucket];
      removed.push({ bucket, key });
    };
    let skipped = 0;
    for (const candidate of candidates) {
      if (binding(current, candidate.bucket, candidate.key, cutoff) !== candidate.binding) { skipped++; continue; }
      remove(candidate.bucket, candidate.key);
      if (candidate.bucket === 'rooms') remove('presence', candidate.key);
    }
    const result = { ...report, removed, skipped };
    return removed.length ? { value: Object.keys(next).length ? next : null, result } : { result };
  });
}
