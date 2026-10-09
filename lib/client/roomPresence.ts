import { onDisconnect, onValue, ref, remove, set, type Database } from 'firebase/database';
import { newActionId } from '../game/commands';

export interface PresenceState { known: boolean; online: Record<string, boolean>; error: string | null }
export const UNKNOWN_PRESENCE: PresenceState = { known: false, online: {}, error: null };
export interface PresenceAdapter {
  connected(callback: (online: boolean) => void): () => void;
  watch(callback: (value: unknown) => void, failed: () => void): () => void;
  connection(id: string): { arm(): Promise<void>; set(): Promise<void>; remove(): Promise<void>; cancel(): Promise<void> };
}
export function onlineMembers(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([uid, entries]) => [uid,
    !!entries && typeof entries === 'object' && !Array.isArray(entries) && Object.values(entries).some(entry => entry === true),
  ]));
}
export function firebasePresence(db: Database, code: string, uid: string): PresenceAdapter {
  return {
    connected: callback => onValue(ref(db, '.info/connected'), snapshot => callback(snapshot.val() === true), () => callback(false)),
    watch: (callback, failed) => onValue(ref(db, `presence/${code}`), snapshot => callback(snapshot.val()), failed),
    connection(id) {
      const location = ref(db, `presence/${code}/${uid}/${id}`), disconnect = onDisconnect(location);
      return { arm: () => disconnect.remove(), set: () => set(location, true), remove: () => remove(location), cancel: () => disconnect.cancel() };
    },
  };
}

/** Presence never edits membership, game state or expiry. Each connection owns one leaf. */
export class RoomPresence {
  private stopped = false;
  private connected = false;
  private epoch = 0;
  private connectedOff: (() => void) | null = null;
  private watchOff: (() => void) | null = null;
  private connection: ReturnType<PresenceAdapter['connection']> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private attempts = 0;
  constructor(private adapter: PresenceAdapter, private notify: (state: PresenceState) => void, private id = newActionId) {}
  start() {
    if (this.stopped || this.connectedOff) return;
    this.connectedOff = this.adapter.connected(connected => this.changed(connected));
  }
  private cleanup(connection: ReturnType<PresenceAdapter['connection']>) {
    // Keep onDisconnect armed if an offline removal is still pending or fails.
    void connection.remove().then(() => connection.cancel()).catch(() => {});
  }
  private changed(connected: boolean) {
    if (this.stopped || this.connected === connected) return;
    this.connected = connected; this.epoch++;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.watchOff?.(); this.watchOff = null;
    this.notify(UNKNOWN_PRESENCE);
    if (this.connection) { this.cleanup(this.connection); this.connection = null; }
    if (!connected) return;
    const epoch = this.epoch;
    this.watchOff = this.adapter.watch(value => {
      if (!this.stopped && this.connected && epoch === this.epoch) this.notify({ known: true, online: onlineMembers(value), error: null });
    }, () => {
      if (!this.stopped && epoch === this.epoch) this.notify({ ...UNKNOWN_PRESENCE, error: 'ยังตรวจการเชื่อมต่อของคู่เล่นไม่ได้' });
    });
    this.attempts = 0;
    void this.register(epoch);
  }
  private async register(epoch: number) {
    if (this.stopped || !this.connected || epoch !== this.epoch) return;
    let connection: ReturnType<PresenceAdapter['connection']> | null = null;
    try {
      connection = this.adapter.connection(this.id());
      this.connection = connection;
      await connection.arm(); // Must succeed before publishing online.
      if (this.stopped || !this.connected || epoch !== this.epoch) { this.cleanup(connection); return; }
      await connection.set();
      if (this.stopped || !this.connected || epoch !== this.epoch) this.cleanup(connection);
      else this.attempts = 0;
    } catch {
      if (connection) this.cleanup(connection);
      if (this.connection === connection) this.connection = null;
      if (this.stopped || !this.connected || epoch !== this.epoch) return;
      this.notify({ ...UNKNOWN_PRESENCE, error: 'ยังแจ้งสถานะการเชื่อมต่อไม่ได้ กำลังลองใหม่' });
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null; void this.register(epoch);
      }, Math.min(15_000, 1500 * 2 ** this.attempts++));
    }
  }
  dispose() {
    if (this.stopped) return;
    this.stopped = true; this.epoch++;
    this.connectedOff?.(); this.watchOff?.();
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.connection) this.cleanup(this.connection);
    this.connection = null;
  }
}
