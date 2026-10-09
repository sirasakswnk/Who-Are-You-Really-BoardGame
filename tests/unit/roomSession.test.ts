import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomSession } from '../../lib/client/roomSession';
import { RoomApiError } from '../../lib/client/roomApi';
import { readPending, savePending, type PendingAction } from '../../lib/client/pendingAction';
import { actionContext } from '../../lib/game/commands';
import { clientSnapshot, deferred, tabStorage } from '../helpers/clientSnapshot';

const sessions: RoomSession[] = [];
beforeEach(() => vi.useFakeTimers());
afterEach(() => { sessions.splice(0).forEach(session => session.dispose()); vi.useRealTimers(); });
function session(request: ConstructorParameters<typeof RoomSession>[2], storage = tabStorage(), onChange = vi.fn()) {
  const value = new RoomSession('ABC234', 'host', request, storage, onChange); sessions.push(value);
  return value;
}

describe('Room session polling and lifecycle', () => {
  it('leaves only after POST confirmation without reading the now-forbidden private view', async () => {
    const post = deferred<unknown>(), request = vi.fn((url: string, body?: unknown) => body ? post.promise : Promise.resolve(clientSnapshot()));
    const controller = session(request); await controller.start(); const leave = controller.leave();
    expect(controller.state.left).toBe(false); expect(controller.state.sending).toBe(true);
    expect(request.mock.calls[1][0]).toBe('/api/room/leave'); post.resolve({ success: true }); await leave;
    expect(controller.state.left).toBe(true); expect(controller.state.pending).toBeNull(); expect(request).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(60_000); expect(request).toHaveBeenCalledTimes(2);
  });
  it('persists a lost leave response and retries the same identity despite GET membership denial', async () => {
    const storage = tabStorage(), bodies: unknown[] = []; let removed = false, lose = true;
    const request = vi.fn(async (_url: string, body?: unknown) => {
      if (!body) { if (removed) throw new RoomApiError('ไม่มีสิทธิ์', 403, false); return clientSnapshot(); }
      bodies.push(body); removed = true;
      if (lose) { lose = false; throw new RoomApiError('ผลตอบกลับหาย', 0, true, true); }
      return { success: true };
    });
    const controller = session(request, storage); await controller.start(); await controller.leave();
    expect(controller.state.left).toBe(false); expect(controller.state.pending?.envelope.action.type).toBe('PLAYER_LEAVE');
    controller.dispose(); const resumed = session(request, storage); await resumed.start();
    expect(resumed.state.left).toBe(true); expect(bodies).toHaveLength(2); expect(bodies[0]).toEqual(bodies[1]);
  });
  it('does not infer leave completion from a phase transition or allow gameplay during pending leave', async () => {
    const controller = session(async (_url, body) => { if (body) throw new RoomApiError('หาย'); return clientSnapshot(); });
    await controller.start(); await controller.leave(); const id = controller.state.pending?.envelope.actionId;
    const newer = clientSnapshot('ANSWER_REVEAL', 2); controller.receive('public', newer.public); controller.receive('private', newer.private);
    expect(controller.state.pending?.envelope.actionId).toBe(id); expect(controller.state.left).toBe(false);
    await controller.submit({ type: 'REVEAL_ACK' }); expect(controller.state.pending?.envelope.actionId).toBe(id);
  });
  it('reacts to departure in another tab and ignores an older public removal', async () => {
    const controller = session(async () => clientSnapshot('LOBBY', 5)); await controller.start();
    const old = clientSnapshot('LOBBY', 4); old.public.players[0] = null; controller.receive('public', old.public);
    expect(controller.state.left).toBe(false);
    const newer = clientSnapshot('LOBBY', 6); newer.public.players[0] = null; controller.receive('public', newer.public);
    expect(controller.state.left).toBe(true); expect(controller.state.actionBlocked).toBe(true);
  });
  it('detects an explicit departure in another tab via API fallback membership denial', async () => {
    let removed = false; const controller = session(async () => { if (removed) throw new RoomApiError('ไม่มีสิทธิ์', 403, false); return clientSnapshot(); });
    await controller.start(); removed = true; await controller.refresh(); expect(controller.state.left).toBe(true);
  });
  it('allows explicit departure to replace an uncertain game command but never overlaps an in-flight write', async () => {
    const post = deferred<unknown>(), request = vi.fn((url: string, body?: unknown) => {
      if (!body) return Promise.resolve(clientSnapshot()); if (url === '/api/room/leave') return Promise.resolve({ success: true }); return post.promise;
    });
    const controller = session(request); await controller.start(); const submit = controller.submit({ type: 'SUBMIT_ANSWER', optionId: 'a' });
    await controller.leave(); expect(request).toHaveBeenCalledTimes(2);
    post.reject(new RoomApiError('หาย')); await submit; expect(controller.state.pending?.envelope.action.type).toBe('SUBMIT_ANSWER');
    await controller.leave(); expect(controller.state.left).toBe(true); expect(request.mock.calls.at(-1)?.[0]).toBe('/api/room/leave');
  });
  it('backs off failed reads and respects rate-limit recovery time', async () => {
    const request = vi.fn(async () => { throw new RoomApiError('รอหนึ่งนาที', 429, true, false, 60_000); });
    const controller = session(request); await controller.start();
    await vi.advanceTimersByTimeAsync(59_000); await controller.refresh();
    expect(request).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1000); expect(request).toHaveBeenCalledTimes(2);
  });
  it('stops automatic requests after a definitive room/membership failure', async () => {
    const request = vi.fn(async () => { throw new RoomApiError('ไม่มีสิทธิ์', 403, false); });
    const controller = session(request); await controller.start();
    await vi.advanceTimersByTimeAsync(60_000); expect(request).toHaveBeenCalledOnce();
    await controller.refresh(); expect(request).toHaveBeenCalledTimes(2);
  });
  it('deduplicates concurrent GETs and prevents overlapping polls', async () => {
    const read = deferred<unknown>(), request = vi.fn(() => read.promise), controller = session(request);
    const started = controller.start();
    const same = controller.refresh();
    await vi.advanceTimersByTimeAsync(4500);
    expect(request).toHaveBeenCalledOnce();
    read.resolve(clientSnapshot()); await started; await same;
    expect(controller.state.actionBlocked).toBe(false);
  });
  it('uses a slow watchdog when realtime is healthy and a fast fallback after listener failure', async () => {
    const view = clientSnapshot(), request = vi.fn(async () => view), controller = session(request);
    await controller.start();
    controller.setConnected(true); controller.receive('public', view.public); controller.receive('private', view.private);
    await vi.advanceTimersByTimeAsync(1500); expect(request).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(13_500); expect(request).toHaveBeenCalledTimes(2);
    controller.realtimeError('private'); await Promise.resolve(); await Promise.resolve();
    expect(controller.state.realtime).toBe(false);
    await vi.advanceTimersByTimeAsync(1500); expect(request.mock.calls.length).toBeGreaterThanOrEqual(4);
  });
  it('disables mutations while public/private streams are in different phases', async () => {
    const controller = session(async () => clientSnapshot()); await controller.start();
    const next = clientSnapshot('ANSWER_REVEAL', 2);
    controller.receive('public', next.public);
    expect(controller.state.actionBlocked).toBe(true);
    expect(controller.state.snapshot?.public.phase).toBe('ANSWERING');
    controller.receive('private', next.private);
    expect(controller.state.actionBlocked).toBe(false);
    expect(controller.state.snapshot?.private.phase).toBe('ANSWER_REVEAL');
  });
  it('retains the last coherent screen during disconnection and recovers via API', async () => {
    let fail = false;
    const controller = session(async () => { if (fail) throw new RoomApiError('ออฟไลน์'); return clientSnapshot(); });
    await controller.start(); fail = true; await controller.refresh();
    expect(controller.state.snapshot).not.toBeNull();
    expect(controller.state.connectionError).toBe('ออฟไลน์'); expect(controller.state.actionBlocked).toBe(true);
    fail = false; await controller.refresh(); expect(controller.state.connectionError).toBeNull();
    expect(controller.state.actionBlocked).toBe(false);
  });
  it('cleans timers and ignores late callbacks after the room unmounts', async () => {
    const read = deferred<unknown>(), onChange = vi.fn(), controller = session(() => read.promise, tabStorage(), onChange);
    const started = controller.start(); controller.dispose(); const count = onChange.mock.calls.length;
    read.resolve(clientSnapshot()); await started;
    controller.receive('public', clientSnapshot().public); controller.setConnected(true);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(onChange).toHaveBeenCalledTimes(count); expect(vi.getTimerCount()).toBe(0);
  });
});

describe('Retained commands, recovery and resume', () => {
  it('copies the choice before async transport so later selection changes cannot alter retries', async () => {
    const post = deferred<unknown>(), storage = tabStorage();
    const controller = session(async (_, body) => { if (!body) return clientSnapshot(); return post.promise; }, storage);
    await controller.start();
    const choice = { type: 'SUBMIT_ANSWER' as const, optionId: 'a' };
    const submitted = controller.submit(choice); choice.optionId = 'b';
    expect(controller.state.pending?.envelope.action).toEqual({ type: 'SUBMIT_ANSWER', optionId: 'a' });
    post.reject(new RoomApiError('offline')); await submitted;
    expect(readPending(storage, 'host', 'ABC234')?.envelope.action).toEqual({ type: 'SUBMIT_ANSWER', optionId: 'a' });
  });
  it('stores before transport, blocks replacement and retries the exact original payload', async () => {
    let view = clientSnapshot(), postCount = 0;
    const storage = tabStorage(), bodies: unknown[] = [];
    const controller = session(async (_, body) => {
      if (body === undefined) return structuredClone(view);
      expect(readPending(storage, 'host', 'ABC234')).not.toBeNull();
      bodies.push(body);
      if (++postCount === 1) throw new RoomApiError('ผลยังไม่แน่นอน', 0, true, true);
      view = { ...view, private: { ...view.private, revision: 2, answerSubmitted: true, committedAnswer: 'a' } };
      return { success: true };
    }, storage);
    await controller.start(); await controller.submit({ type: 'SUBMIT_ANSWER', optionId: 'a' });
    expect(controller.state.pending).not.toBeNull(); expect(controller.state.actionBlocked).toBe(true);
    await controller.submit({ type: 'SUBMIT_ANSWER', optionId: 'b' }); expect(bodies).toHaveLength(1);
    await controller.retry(); expect(bodies).toHaveLength(2); expect(bodies[1]).toEqual(bodies[0]);
    expect(controller.state.pending).toBeNull(); expect(storage.values.size).toBe(0);
    expect(controller.state.snapshot?.private.committedAnswer).toBe('a');
  });
  it('settles a lost committed response by reading locked state without sending again', async () => {
    let view = clientSnapshot(); const posts = vi.fn();
    const controller = session(async (_, body) => {
      if (body === undefined) return view;
      posts(); view = { ...view, private: { ...view.private, revision: 2, answerSubmitted: true, committedAnswer: 'a' } };
      throw new RoomApiError('response lost', 0, true, true);
    });
    await controller.start(); await controller.submit({ type: 'SUBMIT_ANSWER', optionId: 'a' });
    expect(controller.state.pending).toBeNull(); expect(controller.state.actionError).toBeNull();
    await controller.retry(); expect(posts).toHaveBeenCalledOnce();
  });
  it('restores an unresolved choice on reload and never replaces it with a new UUID', async () => {
    const storage = tabStorage(), firstBodies: unknown[] = [], retryBodies: unknown[] = [];
    const first = session(async (_, body) => { if (body === undefined) return clientSnapshot(); firstBodies.push(body); throw new RoomApiError('offline'); }, storage);
    await first.start(); await first.submit({ type: 'SUBMIT_ANSWER', optionId: 'b' }); first.dispose();
    const next = session(async (_, body) => { if (body === undefined) return clientSnapshot(); retryBodies.push(body); throw new RoomApiError('offline'); }, storage);
    await next.start(); expect(next.state.pending?.envelope.action.type).toBe('SUBMIT_ANSWER');
    await next.retry(); expect(retryBodies[0]).toEqual(firstBodies[0]);
  });
  it('clears a restored request when the committed submission is already present', async () => {
    const storage = tabStorage(), view = clientSnapshot();
    const pending: PendingAction = { version: 1, uid: 'host', code: 'ABC234', envelope: { ...actionContext(view.public), action: { type: 'SUBMIT_ANSWER', optionId: 'a' } } };
    savePending(storage, pending); view.private.answerSubmitted = true; view.private.committedAnswer = 'a';
    const request = vi.fn(async () => view), controller = session(request, storage); await controller.start();
    expect(controller.state.pending).toBeNull(); expect(controller.state.actionError).toBeNull();
    expect(request).toHaveBeenCalledOnce();
  });
  it('does not submit another decision after refresh following continue or guess', async () => {
    const view = clientSnapshot('DECIDING'); view.private.decisionSubmitted = true;
    const request = vi.fn(async () => view), controller = session(request); await controller.start();
    await controller.submit({ type: 'SUBMIT_DECISION', decision: { type: 'continue' } });
    expect(request).toHaveBeenCalledOnce();
  });
  it('reads after POST even when an older poll was still in flight', async () => {
    let reads = 0, committed = false;
    const staleRead = deferred<unknown>(), stale = clientSnapshot(), latest = clientSnapshot('ANSWERING', 2);
    latest.private.answerSubmitted = true; latest.private.committedAnswer = 'a';
    const controller = session(async (_, body) => {
      if (body !== undefined) { committed = true; return { success: true }; }
      if (++reads === 2) return staleRead.promise;
      return committed ? latest : stale;
    });
    await controller.start(); const oldPoll = controller.refresh();
    const submitted = controller.submit({ type: 'SUBMIT_ANSWER', optionId: 'a' });
    await Promise.resolve(); expect(controller.state.actionBlocked).toBe(true);
    staleRead.resolve(stale); await oldPoll; await submitted;
    expect(reads).toBe(3); expect(controller.state.snapshot?.private.answerSubmitted).toBe(true);
    expect(controller.state.pending).toBeNull();
  });
  it('keeps a confirmed POST blocked if the follow-up GET failed', async () => {
    let posted = false;
    const controller = session(async (_, body) => {
      if (body !== undefined) { posted = true; return { success: true }; }
      if (posted) throw new RoomApiError('โหลดสถานะไม่ได้'); return clientSnapshot();
    });
    await controller.start(); await controller.submit({ type: 'SUBMIT_ANSWER', optionId: 'a' });
    expect(controller.state.pending).not.toBeNull(); expect(controller.state.actionBlocked).toBe(true);
    expect(controller.state.actionError?.message).toContain('สำเร็จแล้ว');
  });
  it('rejects malformed snapshots without clearing a pending choice', async () => {
    let malformed = false;
    const controller = session(async (_, body) => {
      if (body !== undefined) { malformed = true; throw new RoomApiError('offline'); }
      return malformed ? { public: clientSnapshot().public, private: {} } : clientSnapshot();
    });
    await controller.start(); await controller.submit({ type: 'SUBMIT_ANSWER', optionId: 'a' });
    expect(controller.state.pending).not.toBeNull(); expect(controller.state.connectionError).not.toBeNull();
    expect(controller.state.snapshot?.private.answerSubmitted).toBe(false);
  });
  it('reports a different answer already locked by another tab and shows the committed choice', async () => {
    let view = clientSnapshot();
    const controller = session(async (_, body) => {
      if (body === undefined) return view;
      view = { ...view, private: { ...view.private, revision: 2, committedAnswer: 'b', answerSubmitted: true } };
      throw new RoomApiError('locked', 400, false);
    });
    await controller.start(); await controller.submit({ type: 'SUBMIT_ANSWER', optionId: 'a' });
    expect(controller.state.snapshot?.private.committedAnswer).toBe('b');
    expect(controller.state.pending).toBeNull();
  });
  it('clears pending work from a completed round before allowing new-context commands', async () => {
    const old = clientSnapshot(), storage = tabStorage(), next = clientSnapshot('ANSWERING', 2);
    next.public.roundId = next.private.roundId = 'match-test:round:1'; next.public.roundIndex = 1;
    savePending(storage, { version: 1, code: 'ABC234', uid: 'host', envelope: { ...actionContext(old.public), action: { type: 'SUBMIT_ANSWER', optionId: 'a' } } });
    const request = vi.fn<ConstructorParameters<typeof RoomSession>[2]>(async () => next), controller = session(request, storage); await controller.start();
    expect(controller.state.pending).toBeNull(); expect(controller.state.actionBlocked).toBe(false);
    await controller.retry(); expect(request.mock.calls.every(([, body]) => body === undefined)).toBe(true);
  });
  it('retains the envelope in memory when browser storage is unavailable', async () => {
    const unavailable = { getItem() { throw new Error(); }, setItem() { throw new Error(); }, removeItem() { throw new Error(); } };
    const controller = new RoomSession('ABC234', 'host', async (_, body) => { if (!body) return clientSnapshot(); throw new RoomApiError('offline'); }, unavailable, vi.fn());
    sessions.push(controller); await controller.start(); await controller.submit({ type: 'SUBMIT_ANSWER', optionId: 'a' });
    expect(controller.state.pending?.envelope.actionId).toMatch(/^[0-9a-f-]{36}$/);
  });
  it('isolates pending choices by actor, room, and storage version', () => {
    const view = clientSnapshot(), storage = tabStorage();
    const pending: PendingAction = { version: 1, code: 'ABC234', uid: 'host', envelope: { ...actionContext(view.public), action: { type: 'ROLE_ACK' } } };
    savePending(storage, pending); expect(readPending(storage, 'host', 'XYZ789')).toBeNull();
    expect(readPending(storage, 'host', 'ABC234')).toEqual(pending);
    expect(readPending(storage, 'guest', 'ABC234')).toBeNull();
    storage.setItem('wayr.pendingAction.v1:ABC234', JSON.stringify({ ...pending, version: 2 }));
    expect(readPending(storage, 'host', 'ABC234')).toBeNull();
  });
});
