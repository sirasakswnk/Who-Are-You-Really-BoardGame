import { describe, it, expect, vi } from 'vitest';
import { RoundNotes } from '../../lib/client/roundNotes';
import { tabStorage } from '../helpers/clientSnapshot';
const first = { contentVersion: 'hidden-identities-v1' as const, matchId: 'match-a', roundId: 'match-a:round:0', revision: 2 };
describe('F06 notes lifecycle, privacy and tab ordering', () => {
  it('preserves notes across clues, phase changes and a fresh controller/refresh', () => {
    const storage = tabStorage(), notify = vi.fn(), notes = new RoundNotes(storage, 'host', 'ABC234', notify);
    notes.activate(first); notes.toggle('spy', 'suspect'); notes.activate({ ...first, revision: 8 });
    expect(notify.mock.calls.at(-1)?.[0]).toEqual({ spy: 'suspect' });
    const resumed = vi.fn(); new RoundNotes(storage, 'host', 'ABC234', resumed).activate({ ...first, revision: 8 });
    expect(resumed).toHaveBeenLastCalledWith({ spy: 'suspect' });
  });
  it('clears notes for a new round and clears the old match on the rematch lobby', () => {
    const storage = tabStorage(), notify = vi.fn(), notes = new RoundNotes(storage, 'host', 'ABC234', notify);
    notes.activate(first); notes.toggle('spy', 'suspect'); notes.activate({ ...first, roundId: 'match-a:round:1', revision: 10 });
    expect(notify).toHaveBeenLastCalledWith({}); notes.toggle('vampire', 'cleared');
    notes.activate({ matchId: 'match-b', roundId: null, revision: 20 });
    expect(notify).toHaveBeenLastCalledWith({}); expect(JSON.parse(storage.getItem(notes.key)!)).toMatchObject({ matchId: 'match-b', roundId: null, notes: {} });
    expect(storage.getItem(notes.key)).not.toContain('vampire');
  });
  it('does not let an old tab restore previous-match notes after another tab reset', () => {
    const storage = tabStorage(), a = new RoundNotes(storage, 'host', 'ABC234', vi.fn()), b = new RoundNotes(storage, 'host', 'ABC234', vi.fn());
    a.activate(first); a.toggle('spy', 'suspect'); b.activate({ matchId: 'match-b', roundId: null, revision: 20 });
    const saved = storage.getItem(a.key); a.activate(first); a.toggle('spy', 'cleared');
    expect(storage.getItem(a.key)).toBe(saved);
  });
  it('merges a fresh write with another tab note and synchronizes via reload', () => {
    const storage = tabStorage(), notify = vi.fn(), a = new RoundNotes(storage, 'host', 'ABC234', notify), b = new RoundNotes(storage, 'host', 'ABC234', vi.fn());
    a.activate(first); b.activate(first); a.toggle('spy', 'suspect'); b.toggle('vampire', 'cleared'); a.reload();
    expect(notify).toHaveBeenLastCalledWith({ spy: 'suspect', vampire: 'cleared' });
    a.toggle('spy', 'suspect'); expect(notify).toHaveBeenLastCalledWith({ vampire: 'cleared' });
  });
  it('does not lower the stored revision when a lagging same-round tab changes a note', () => {
    const storage = tabStorage(), a = new RoundNotes(storage, 'host', 'ABC234', vi.fn()), b = new RoundNotes(storage, 'host', 'ABC234', vi.fn());
    a.activate(first); b.activate({ ...first, revision: 15 }); a.toggle('spy', 'suspect');
    expect(JSON.parse(storage.getItem(a.key)!).revision).toBe(15);
  });
  it('isolates uid and room, discards malformed storage, and works without storage', () => {
    const storage = tabStorage(), a = new RoundNotes(storage, 'host', 'ABC234', vi.fn()); a.activate(first); a.toggle('spy', 'suspect');
    for (const [uid, code] of [['guest', 'ABC234'], ['host', 'BCD234']]) {
      const notify = vi.fn(); new RoundNotes(storage, uid, code, notify).activate(first); expect(notify).toHaveBeenLastCalledWith({});
    }
    storage.setItem(a.key, '{bad json'); const notify = vi.fn(); new RoundNotes(storage, 'host', 'ABC234', notify).activate(first); expect(notify).toHaveBeenLastCalledWith({});
    const memory = new RoundNotes(null, 'host', 'ABC234', notify); memory.activate(first); memory.toggle('spy', 'suspect');
    memory.activate({ ...first, revision: 4 }); expect(notify).toHaveBeenLastCalledWith({ spy: 'suspect' });
    memory.activate({ matchId: 'new', roundId: null, revision: 6 }); expect(notify).toHaveBeenLastCalledWith({});
  });
  it('catches blocked storage and rejects foreign actor/version/unknown note fields', () => {
    const notify = vi.fn(), blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() {} };
    const memory = new RoundNotes(blocked, 'host', 'ABC234', notify); memory.activate(first); memory.toggle('spy', 'suspect');
    expect(notify).toHaveBeenLastCalledWith({ spy: 'suspect' });
    const storage = tabStorage(), notes = new RoundNotes(storage, 'host', 'ABC234', notify);
    for (const change of [{ uid: 'guest' }, { version: 2 }, { notes: { token: 'secret' } }]) {
      storage.setItem(notes.key, JSON.stringify({ version: 1, uid: 'host', code: 'ABC234', ...first, notes: { spy: 'suspect' }, ...change }));
      notes.activate(first); expect(JSON.parse(storage.getItem(notes.key)!).notes).toEqual({});
    }
  });
});
