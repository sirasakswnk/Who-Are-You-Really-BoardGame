import { actionContext, type ClientCommand } from '../game/commands';
import { RoomApiError } from './roomApi';
import { clearPending, readPending, savePending, type ActionStorage, type PendingAction } from './pendingAction';
import { createSnapshotMerger, commandPhase, pendingResolved, decodePublic, decodePrivate, type RoomSnapshot } from './roomSnapshot';

export interface SessionState {
  snapshot: RoomSnapshot | null;
  loading: boolean;
  sending: boolean;
  synchronizing: boolean;
  actionBlocked: boolean;
  realtime: boolean;
  connectionError: string | null;
  actionError: { message: string; retryable: boolean } | null;
  pending: PendingAction | null;
  left: boolean;
}
export const INITIAL_SESSION: SessionState = {
  snapshot: null, loading: true, sending: false, synchronizing: true, actionBlocked: true,
  realtime: false, connectionError: null, actionError: null, pending: null, left: false,
};
type RequestApi = (url: string, body?: unknown, signal?: AbortSignal) => Promise<unknown>;
const labels: Record<ClientCommand['type'], string> = {
  PLAYER_LEAVE: 'ออกจากห้อง',
  PLAYER_READY: 'เปลี่ยนสถานะพร้อม', START_MATCH: 'เริ่มเกม', ROLE_ACK: 'ยืนยันบทบาท',
  SUBMIT_ANSWER: 'ส่งคำตอบ', REVEAL_ACK: 'ยืนยันการเปิดคำตอบ', SUBMIT_DECISION: 'ส่งการตัดสินใจ',
  NEXT_ROUND_READY: 'ไปต่อหลังจบรอบ', REMATCH_REQUEST: 'ขอเล่นอีกครั้ง',
};

/** One controller per room/tab; the same merger handles realtime and API data. */
export class RoomSession {
  private merger;
  private pending: PendingAction | null;
  private readFlight: Promise<boolean> | null = null;
  private lifetime = new AbortController();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private started = false;
  private loading = true;
  private sending = false;
  private online = true;
  private connected = false;
  private streams = { public: false, private: false };
  private connectionError: string | null = null;
  private actionError: SessionState['actionError'] = null;
  private failedReads = 0;
  private readRetryable = true;
  private readNotBefore = 0;
  private left = false;

  constructor(
    private code: string, private uid: string, private request: RequestApi,
    private storage: ActionStorage | null, private onChange: (state: SessionState) => void,
  ) {
    this.merger = createSnapshotMerger(code, uid);
    this.pending = readPending(storage, uid, code);
    if (this.pending) this.actionError = { message: 'พบคำขอที่ยังรอยืนยัน กำลังตรวจสถานะก่อนให้ส่งคำขอใหม่', retryable: true };
  }
  get state(): SessionState {
    const realtime = this.online && this.connected && this.streams.public && this.streams.private;
    return {
      snapshot: this.merger.snapshot, loading: this.loading, sending: this.sending,
      synchronizing: this.merger.waiting, realtime,
      actionBlocked: this.left || this.merger.removed || !this.merger.snapshot || this.merger.waiting || this.sending || !!this.pending || !this.online || !!this.connectionError,
      connectionError: this.connectionError, actionError: this.actionError, pending: this.pending, left: this.left,
    };
  }
  private emit() { if (!this.disposed) this.onChange(this.state); }
  private schedule() {
    if (this.timer) clearTimeout(this.timer);
    if (!this.started || this.disposed || this.left) return;
    if (this.connectionError && !this.readRetryable) return;
    const base = this.online && (!this.state.realtime || this.merger.waiting || this.connectionError || this.pending) ? 1500 : 15_000;
    const delay = Math.max(base, Math.min(15_000, 1500 * 2 ** this.failedReads), this.readNotBefore - Date.now());
    this.timer = setTimeout(() => { this.timer = null; void this.refresh(); }, delay);
  }
  private clearAction() {
    this.pending = null; clearPending(this.storage, this.code);
  }
  private reconcile() {
    if (this.merger.removed && this.pending?.envelope.action.type !== 'PLAYER_LEAVE') {
      this.clearAction(); this.left = true; return;
    }
    const snapshot = this.merger.snapshot, pending = this.pending;
    if (!snapshot || this.merger.waiting || !pending || !pendingResolved(snapshot, pending.envelope)) return;
    const action = pending.envelope.action;
    const changedAnswer = snapshot.public.matchId === pending.envelope.matchId && snapshot.public.roundId === pending.envelope.roundId &&
      snapshot.public.clueIndex === pending.envelope.clueIndex && action.type === 'SUBMIT_ANSWER' &&
      snapshot.private.answerSubmitted && snapshot.private.committedAnswer !== action.optionId;
    this.clearAction();
    this.actionError = changedAnswer ? { message: 'server ล็อกคำตอบจากอีกแท็บไว้แล้ว กรุณาดูคำตอบที่บันทึกในหน้าจอ', retryable: false } : null;
  }
  async start() {
    if (this.started || this.disposed) return;
    this.started = true; this.emit();
    await this.refresh();
    if (this.pending?.envelope.action.type === 'PLAYER_LEAVE' && !this.disposed) await this.sendPending();
  }
  receive(kind: 'public' | 'private', value: unknown) {
    if (this.disposed) return;
    if (!(kind === 'public' ? decodePublic(value, this.code) : decodePrivate(value))) { this.realtimeError(kind); return; }
    this.streams[kind] = true;
    this.merger[kind](value);
    this.reconcile(); this.emit(); this.schedule();
  }
  realtimeError(kind: 'public' | 'private') {
    if (this.disposed) return;
    this.streams[kind] = false;
    this.emit(); this.schedule();
    void this.refresh();
  }
  setConnected(connected: boolean) {
    if (this.disposed) return;
    this.connected = connected; this.emit(); this.schedule();
  }
  setOnline(online: boolean) {
    if (this.disposed) return;
    this.online = online;
    if (!online) this.connectionError = 'ออฟไลน์อยู่ คำขอที่รอยืนยันยังถูกเก็บไว้ กรุณาเชื่อมต่อแล้วตรวจสถานะอีกครั้ง';
    this.emit(); this.schedule();
    if (online) void this.refreshFresh();
  }
  /** Concurrent poll/manual refresh callers share a single GET. */
  refresh(): Promise<boolean> {
    if (this.disposed || this.left) return Promise.resolve(false);
    if (Date.now() < this.readNotBefore) return Promise.resolve(false);
    if (this.readFlight) return this.readFlight;
    const read = async () => {
      try {
        const data = await this.request(`/api/room/${this.code}`, undefined, this.lifetime.signal);
        if (this.disposed) return false;
        if (!this.merger.pair(data)) throw new RoomApiError('ข้อมูลห้องยังไม่ตรงกัน กรุณาลองโหลดสถานะอีกครั้ง', 502, true);
        this.connectionError = null;
        this.failedReads = 0; this.readRetryable = true; this.readNotBefore = 0;
        this.reconcile();
        return !this.merger.waiting;
      } catch (error) {
        if (!this.disposed) {
          if (error instanceof RoomApiError && error.status === 403 && this.merger.snapshot && this.pending?.envelope.action.type !== 'PLAYER_LEAVE') {
            this.clearAction(); this.left = true;
          }
          this.connectionError = error instanceof Error ? error.message : 'เชื่อมต่อห้องไม่ได้ กรุณาลองใหม่';
          this.failedReads = Math.min(this.failedReads + 1, 4);
          this.readRetryable = !(error instanceof RoomApiError) || error.retryable;
          if (error instanceof RoomApiError && error.retryAfterMs) this.readNotBefore = Date.now() + error.retryAfterMs;
        }
        return false;
      } finally {
        if (!this.disposed) { this.loading = false; this.emit(); }
      }
    };
    this.readFlight = read().finally(() => { this.readFlight = null; this.schedule(); });
    return this.readFlight;
  }
  /** Mutation reconciliation must read after POST, never reuse an earlier poll. */
  async refreshFresh(): Promise<boolean> {
    if (this.readFlight) await this.readFlight;
    return this.refresh();
  }
  async submit(action: ClientCommand): Promise<void> {
    if (action.type === 'PLAYER_LEAVE') { await this.leave(); return; }
    const snapshot = this.merger.snapshot;
    if (this.disposed || this.state.actionBlocked || !snapshot || snapshot.public.phase !== commandPhase(action)) return;
    const envelope = { ...actionContext(snapshot.public), action: structuredClone(action) };
    if (pendingResolved(snapshot, envelope)) return;
    this.pending = { version: 1, uid: this.uid, code: this.code, envelope };
    savePending(this.storage, this.pending); // Before transport; reload preserves the exact choice.
    this.actionError = null;
    await this.sendPending();
  }
  async retry(): Promise<void> {
    if (this.disposed || this.sending) return;
    if (this.pending?.envelope.action.type === 'PLAYER_LEAVE') { await this.sendPending(); return; }
    // Resolve a lost response or completed context before resending anything.
    if (!await this.refreshFresh() || !this.pending || this.disposed) return;
    await this.sendPending();
  }
  async leave(): Promise<void> {
    const snapshot = this.merger.snapshot;
    if (this.disposed || this.left || this.sending) return;
    if (this.pending?.envelope.action.type === 'PLAYER_LEAVE') { await this.retry(); return; }
    if (!snapshot) return;
    // Explicit departure may replace an uncertain game command. Both serialize at room CAS;
    // departure ends this match and cannot affect a new match identity.
    this.pending = { version: 1, uid: this.uid, code: this.code, envelope: { ...actionContext(snapshot.public), action: { type: 'PLAYER_LEAVE' } } };
    savePending(this.storage, this.pending);
    await this.sendPending();
  }
  private async sendPending() {
    const pending = this.pending;
    if (!pending || this.disposed || this.sending) return;
    this.sending = true; this.actionError = null; this.emit();
    const { action, ...context } = pending.envelope;
    const endpoint = action.type === 'PLAYER_LEAVE' ? '/api/room/leave' : action.type === 'PLAYER_READY' ? '/api/room/ready' : action.type === 'START_MATCH' ? '/api/room/start' : '/api/game/action';
    const body = action.type === 'PLAYER_READY' ? { code: this.code, ...context, ready: action.ready }
      : action.type === 'START_MATCH' || action.type === 'PLAYER_LEAVE' ? { code: this.code, ...context } : { code: this.code, ...context, action };
    try {
      await this.request(endpoint, body, this.lifetime.signal);
      if (this.disposed) return;
      if (action.type === 'PLAYER_LEAVE') { this.clearAction(); this.actionError = null; this.left = true; return; }
      const fresh = await this.refreshFresh();
      // POST success proves the receipt even if another tab subsequently changed ready.
      if (fresh && this.pending?.envelope.actionId === pending.envelope.actionId) this.clearAction();
      else if (!fresh && this.pending) this.actionError = { message: `${labels[action.type]}สำเร็จแล้ว แต่ยังโหลดสถานะล่าสุดไม่ได้ กรุณาตรวจสถานะก่อนส่งคำขอใหม่`, retryable: true };
    } catch (error) {
      if (this.disposed) return;
      if (!this.pending) { await this.refreshFresh(); return; } // Realtime already proved the locked/advanced state.
      const recoverable = !(error instanceof RoomApiError) || error.retryable || error.uncertain;
      this.actionError = {
        message: `${labels[action.type]}: ${error instanceof Error ? error.message : 'ยังยืนยันผลไม่ได้ กรุณาลองคำขอเดิม'}`,
        retryable: recoverable,
      };
      if (!recoverable && this.pending?.envelope.actionId === pending.envelope.actionId) this.clearAction();
      await this.refreshFresh();
    } finally {
      if (!this.disposed) { this.sending = false; this.emit(); this.schedule(); }
    }
  }
  dispose() {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.lifetime.abort();
  }
}
