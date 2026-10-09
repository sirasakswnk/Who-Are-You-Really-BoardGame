import { createHash } from 'node:crypto';
import { InvalidRoomDataError } from './roomSchema';
import { RoomServiceError } from './roomErrors';
import type { RoomStore } from './roomStore';
import { RATE_WINDOW_MS } from './roomMaintenance';

export const RATE_LIMITS = { create: 8, room: 120, game: 120, read: 300 } as const;
export type RateBucket = keyof typeof RATE_LIMITS;
/** One shared counter per authenticated uid/bucket, independent of instance/room. */
export async function enforceRateLimit(store: RoomStore, uid: string, bucket: RateBucket, now: number): Promise<void> {
  const key = createHash('sha256').update(JSON.stringify([uid, bucket])).digest('hex');
  const allowed = await store.transact(`requestLimits/${key}`, raw => {
    let current = { windowStart: now, count: 0 };
    if (raw !== null) {
      if (!raw || typeof raw !== 'object') throw new InvalidRoomDataError();
      const data = raw as Record<string, unknown>;
      if (!Number.isSafeInteger(data.windowStart) || !Number.isSafeInteger(data.count) || Number(data.count) < 0) throw new InvalidRoomDataError();
      current = { windowStart: Number(data.windowStart), count: Number(data.count) };
      if (now >= current.windowStart + RATE_WINDOW_MS) current = { windowStart: now, count: 0 };
    }
    if (current.count >= RATE_LIMITS[bucket]) return { result: false };
    return { value: { ...current, count: current.count + 1 }, result: true };
  });
  if (!allowed) throw new RoomServiceError('ส่งคำขอถี่เกินไป กรุณารอหนึ่งนาทีแล้วลองคำขอเดิม', 429, true);
}
