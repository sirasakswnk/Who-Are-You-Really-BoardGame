import { createFirebaseRoomStore, RoomStorageError } from './firebaseRestStore';
export { createFirebaseRoomStore, RoomStorageError } from './firebaseRestStore';
import { adminDb, getAdminDatabaseAccessToken, isAdminInitializedWithCredentials } from '../firebase/admin';
import type { RoomRecord } from './roomRecord';

export interface TransactionUpdate<T> { value?: unknown; result: T }
export interface RoomStore {
  read(path: string): Promise<unknown>;
  transact<T>(path: string, update: (current: unknown) => TransactionUpdate<T>): Promise<T>;
}

/** Only selected in isolated NODE_ENV=test runs without an emulator. */
export const memoryRooms = new Map<string, RoomRecord>();
const memoryOther = new Map<string, unknown>();
const testStore: RoomStore = {
  async read(path) {
    const value = path.startsWith('rooms/') ? memoryRooms.get(path.slice(6)) : memoryOther.get(path);
    return structuredClone(value ?? null);
  },
  async transact(path, update) {
    const isRoom = path.startsWith('rooms/');
    const value = isRoom ? memoryRooms.get(path.slice(6)) : memoryOther.get(path);
    const next = update(structuredClone(value ?? null));
    if (next.value !== undefined) {
      if (isRoom) memoryRooms.set(path.slice(6), structuredClone(next.value) as RoomRecord);
      else memoryOther.set(path, structuredClone(next.value));
    }
    return next.result;
  },
};

export function getRoomStore(): RoomStore {
  if (process.env.NODE_ENV === 'test' && !process.env.FIREBASE_DATABASE_EMULATOR_HOST) return testStore;
  const databaseURL = adminDb.app.options.databaseURL;
  if (!databaseURL || (!process.env.FIREBASE_DATABASE_EMULATOR_HOST && !isAdminInitializedWithCredentials)) throw new RoomStorageError();
  const url = new URL(databaseURL);
  if (process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
    url.protocol = 'http:';
    url.host = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
    if (!url.searchParams.has('ns')) url.searchParams.set('ns', new URL(databaseURL).hostname.split('.')[0]);
    return createFirebaseRoomStore({ databaseURL: url.toString(), accessToken: async () => 'owner' });
  }
  return createFirebaseRoomStore({
    databaseURL: url.toString(),
    accessToken: getAdminDatabaseAccessToken,
  });
}
