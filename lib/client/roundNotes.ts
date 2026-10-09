import { ROLE_IDS, type RoleId } from '../game/types';
import type { ActionStorage } from './pendingAction';

export type NoteTag = 'suspect' | 'cleared';
export type SuspicionNotes = Partial<Record<RoleId, NoteTag>>;
export interface NotesContext { matchId: string; roundId: string | null; revision: number }
interface NotesRecord extends NotesContext { version: 1; uid: string; code: string; notes: SuspicionNotes }

/** One bounded current-round record per actor/room; no old notes, secrets or pending choices. */
export class RoundNotes {
  readonly key: string;
  private context: NotesContext | null = null;
  private notes: SuspicionNotes = {};
  private published = false;
  constructor(private storage: ActionStorage | null, private uid: string, private code: string, private notify: (notes: SuspicionNotes) => void) {
    this.key = `wayr.notes.v1:${code}:${uid}`;
  }
  private read(): NotesRecord | null {
    try {
      const raw = this.storage?.getItem(this.key) ?? 'null';
      if (raw.length > 2048) return null;
      const data = JSON.parse(raw);
      if (!data || data.version !== 1 || data.uid !== this.uid || data.code !== this.code ||
          typeof data.matchId !== 'string' || !data.matchId || data.matchId.length > 128 || !(data.roundId === null || (typeof data.roundId === 'string' && data.roundId.length <= 160)) ||
          !Number.isSafeInteger(data.revision) || data.revision < 0 || !data.notes || typeof data.notes !== 'object' || Array.isArray(data.notes) ||
          Object.entries(data.notes).some(([role, tag]) => !ROLE_IDS.includes(role as RoleId) || !['suspect', 'cleared'].includes(String(tag)))) return null;
      return data;
    } catch { return null; }
  }
  private same(a: NotesContext, b: NotesContext) { return a.matchId === b.matchId && a.roundId === b.roundId; }
  private publish(notes: SuspicionNotes) {
    if (!this.published || JSON.stringify(this.notes) !== JSON.stringify(notes)) { this.published = true; this.notes = notes; this.notify(notes); }
  }
  private write(notes: SuspicionNotes) {
    if (!this.context) return;
    try { this.storage?.setItem(this.key, JSON.stringify({ version: 1, uid: this.uid, code: this.code, ...this.context, notes })); } catch { /* Memory fallback. */ }
  }
  activate(context: NotesContext) {
    const before = this.context;
    this.context = context;
    const stored = this.read();
    if (stored && stored.revision >= context.revision && !this.same(stored, context)) { this.publish({}); return; }
    const matching = stored && this.same(stored, context);
    const notes = context.roundId === null ? {} : matching ? stored.notes : before && this.same(before, context) ? this.notes : {};
    if (matching) this.context = { ...context, revision: Math.max(context.revision, stored.revision) };
    this.publish(notes);
    this.write(notes); // Remove prior round/match marks as soon as the coherent server view changes.
  }
  reload() { if (this.context) this.activate(this.context); }
  toggle(role: RoleId, tag: NoteTag) {
    if (!this.context?.roundId || !ROLE_IDS.includes(role)) return;
    const stored = this.read();
    if (stored && stored.revision >= this.context.revision && !this.same(stored, this.context)) { this.publish({}); return; }
    if (stored && this.same(stored, this.context)) this.context = { ...this.context, revision: Math.max(this.context.revision, stored.revision) };
    const notes: SuspicionNotes = { ...(stored && this.same(stored, this.context) ? stored.notes : this.notes) };
    if (notes[role] === tag) delete notes[role]; else notes[role] = tag;
    this.publish(notes); this.write(notes);
  }
}
