import { beforeEach, afterEach, it, expect, vi, describe } from 'vitest';
import { createRoomService } from '../../lib/server/roomService';
import * as roomStore from '../../lib/server/roomStore';
import * as deck from '../../lib/server/deck';
import { createDefaultRoundScenarios } from '../../lib/game/engine';
import { RoomSession } from '../../lib/client/roomSession';
import { RoundNotes } from '../../lib/client/roundNotes';
import { createRoomApi } from '../../lib/client/roomApi';
import { decodeRoomRecord } from '../../lib/server/roomSchema';
import { POST as actionRoute } from '../../app/api/game/action/route';
import { POST as readyRoute } from '../../app/api/room/ready/route';
import { POST as startRoute } from '../../app/api/room/start/route';
import { GET as getRoute } from '../../app/api/room/[code]/route';
import { fakeRTDB } from '../helpers/fakeRTDB';
import { tabStorage } from '../helpers/clientSnapshot';
import type { ClientCommand } from '../../lib/game/commands';

let db: ReturnType<typeof fakeRTDB>, generation: number;
const sessions: RoomSession[] = [];
beforeEach(() => {
  db = fakeRTDB(); generation = 0;
  vi.spyOn(roomStore, 'getRoomStore').mockImplementation(() => db.store());
  vi.spyOn(deck, 'selectMatchDeck').mockImplementation(() => {
    generation++;
    return Array.from({ length: 4 }, (_, r) => createDefaultRoundScenarios(r).map((s, c) => ({ ...s,
      id: `generation-${generation}-r${r}-c${c}`, version: generation, prompt: `เกม ${generation} สถานการณ์รอบ ${r + 1} ข้อ ${c + 1}`,
      options: [{ id: 'same-a', label: `ตอบ A รอบ ${r + 1} ข้อ ${c + 1} เกม ${generation}` }, { id: 'same-b', label: `ตอบ B รอบ ${r + 1} ข้อ ${c + 1} เกม ${generation}` }],
    })));
  });
});
afterEach(() => { sessions.splice(0).forEach(session => session.dispose()); vi.restoreAllMocks(); });
const room = (code: string) => decodeRoomRecord(db.values.get(`rooms/${code}`), code)!;
function client(code: string, uid: string, options: { pending?: ReturnType<typeof tabStorage>; notesStorage?: ReturnType<typeof tabStorage>; loseRematch?: boolean } = {}) {
  const notesStorage = options.notesStorage ?? tabStorage(), noteUpdates = vi.fn(), notes = new RoundNotes(notesStorage, uid, code, noteUpdates);
  const calls: Array<{ url: string; body?: string }> = []; let lose = !!options.loseRematch;
  const transport: typeof fetch = async (input, init) => {
    const url = new URL(String(input), 'http://localhost'), request = new Request(url, init);
    calls.push({ url: url.pathname, body: init?.body as string | undefined });
    if (init?.method === 'GET') return getRoute(request, { params: Promise.resolve({ code }) });
    const handler = url.pathname === '/api/room/ready' ? readyRoute : url.pathname === '/api/room/start' ? startRoute : actionRoute;
    const response = await handler(request);
    if (lose && String(init?.body).includes('REMATCH_REQUEST')) { lose = false; throw new Error('Rematch response lost after commit'); }
    return response;
  };
  const user = { uid, getIdToken: async () => `mock-token-${uid}` };
  const controller = new RoomSession(code, uid, createRoomApi(() => user, uid, transport), options.pending ?? tabStorage(), state => {
    if (state.snapshot && !state.synchronizing) notes.activate(state.snapshot.public);
  }); sessions.push(controller);
  return { controller, notes, notesStorage, noteUpdates, calls };
}
async function game() {
  const service = createRoomService(db.store()), { code } = await service.createRoom('host', 'หนึ่ง', 'cat');
  await service.joinRoom(code, 'guest', 'สอง', 'fox');
  const host = client(code, 'host'), guest = client(code, 'guest');
  await host.controller.start(); await guest.controller.start();
  await host.controller.submit({ type: 'PLAYER_READY', ready: true }); await guest.controller.submit({ type: 'PLAYER_READY', ready: true });
  await host.controller.refresh(); await host.controller.submit({ type: 'START_MATCH' }); await guest.controller.refresh();
  return { code, host, guest };
}
async function pair(players: Awaited<ReturnType<typeof game>>, action: ClientCommand) {
  await Promise.all([players.host.controller.refresh(), players.guest.controller.refresh()]);
  await Promise.all([players.host.controller.submit(action), players.guest.controller.submit(action)]);
  await Promise.all([players.host.controller.refresh(), players.guest.controller.refresh()]);
}
async function finish(players: Awaited<ReturnType<typeof game>>, inspect = false) {
  for (let r = 0; r < 4; r++) {
    await pair(players, { type: 'ROLE_ACK' });
    for (let c = 0; c <= r; c++) {
      await players.host.controller.submit({ type: 'SUBMIT_ANSWER', optionId: 'same-a' });
      if (inspect) {
        const hidden = room(players.code).public;
        expect(hidden.roundHistory).toHaveLength(r); expect(hidden.revealedEvidence).toHaveLength(c);
        expect(JSON.stringify(hidden.revealedEvidence)).not.toContain(`ตอบ A รอบ ${r + 1} ข้อ ${c + 1}`);
        expect(hidden.revealedAnswers.some(entry => entry.clueIndex === c)).toBe(false);
      }
      await players.guest.controller.submit({ type: 'SUBMIT_ANSWER', optionId: 'same-b' });
      await pair(players, { type: 'REVEAL_ACK' });
      if (c < r) await pair(players, { type: 'SUBMIT_DECISION', decision: { type: 'continue' } });
      else {
        const hostRole = room(players.code).private.host.role!, guestRole = room(players.code).private.guest.role!;
        await Promise.all([
          players.host.controller.submit({ type: 'SUBMIT_DECISION', decision: { type: 'guess', roleId: guestRole } }),
          players.guest.controller.submit({ type: 'SUBMIT_DECISION', decision: { type: 'guess', roleId: hostRole } }),
        ]);
        await Promise.all([players.host.controller.refresh(), players.guest.controller.refresh()]);
      }
    }
    if (inspect) {
      const view = players.host.controller.state.snapshot!.public;
      expect(view.roundHistory).toHaveLength(r + 1); expect(view.roundHistory[r]).toMatchObject({ scores: [5 - r, 5 - r], guessClueIndex: [r, r] });
      expect(view.roundHistory[r].evidence).toHaveLength(r + 1);
      expect(view.roundHistory[r].evidence[r]).toMatchObject({ prompt: `เกม 1 สถานการณ์รอบ ${r + 1} ข้อ ${r + 1}`, answers: [`ตอบ A รอบ ${r + 1} ข้อ ${r + 1} เกม 1`, `ตอบ B รอบ ${r + 1} ข้อ ${r + 1} เกม 1`] });
      expect(JSON.stringify(view.roundHistory)).not.toContain('same-a'); expect(JSON.stringify(view.roundHistory)).not.toContain('same-b');
      expect(JSON.stringify(view.roundHistory)).not.toContain('editorial');
    }
    await pair(players, { type: 'NEXT_ROUND_READY' });
  }
}
describe('F06 real route/engine/CAS history and rematch recovery', () => {
  it('plays all four guess timings, persists all revealed content and scores, and reloads without current catalog substitution', async () => {
    const players = await game(); await finish(players, true);
    const view = players.host.controller.state.snapshot!.public;
    expect(view).toMatchObject({ phase: 'MATCH_RESULT', matchScores: [14, 14] }); expect(view.roundHistory).toHaveLength(4);
    const persisted = room(players.code); persisted.server.matchDeck![0][0].options[0].label = 'ข้อความแก้ไขภายหลัง';
    db.put(`rooms/${players.code}`, persisted);
    const resumed = client(players.code, 'host'); await resumed.controller.start();
    expect(resumed.controller.state.snapshot?.public.roundHistory).toEqual(view.roundHistory);
    expect(JSON.stringify(resumed.controller.state.snapshot?.public.roundHistory)).not.toContain('ข้อความแก้ไขภายหลัง');
  });
  it('requires both rematch requests, clears every match flag/notes, recovers a lost response and orders multiple tabs', async () => {
    const players = await game(); await finish(players);
    const oldView = structuredClone(players.host.controller.state.snapshot!), oldMatch = oldView.public.matchId;
    players.host.notes.toggle('spy', 'suspect');
    const pending = tabStorage(), other = client(players.code, 'host', { pending, notesStorage: players.host.notesStorage, loseRematch: true });
    await other.controller.start(); await other.controller.submit({ type: 'REMATCH_REQUEST' });
    expect(other.controller.state.snapshot?.private.rematchRequested).toBe(true); expect(other.controller.state.pending).toBeNull();
    expect(room(players.code).public.phase).toBe('MATCH_RESULT'); expect(room(players.code).public.roundHistory).toHaveLength(4);
    const resumed = client(players.code, 'host', { pending, notesStorage: players.host.notesStorage }); await resumed.controller.start();
    await resumed.controller.submit({ type: 'REMATCH_REQUEST' }); expect(resumed.calls.filter(call => call.body)).toHaveLength(0);
    await players.guest.controller.submit({ type: 'REMATCH_REQUEST' }); await resumed.controller.refresh(); await players.host.controller.refresh();
    const fresh = resumed.controller.state.snapshot!;
    expect(fresh.public.matchId).not.toBe(oldMatch);
    expect(fresh.public).toMatchObject({ phase: 'LOBBY', roundId: null, clueIndex: 0, roundIndex: 0, matchScores: [0, 0], roundHistory: [], revealedEvidence: [], rematchRequests: [false, false] });
    expect(fresh.public.players.every(player => player?.ready === false)).toBe(true);
    expect(fresh.private).toMatchObject({ role: null, guess: null, committedAnswer: null, hasGuessed: false, roleAcknowledged: false, answerSubmitted: false,
      revealAcknowledged: false, decisionSubmitted: false, nextRoundReady: false, rematchRequested: false });
    expect(room(players.code).server.matchDeck).toBeNull(); expect(resumed.noteUpdates).toHaveBeenLastCalledWith({});
    const record = players.host.notesStorage.getItem(players.host.notes.key); other.notes.toggle('spy', 'cleared');
    expect(players.host.notesStorage.getItem(players.host.notes.key)).toBe(record);
    resumed.controller.receive('public', oldView.public); resumed.controller.receive('private', oldView.private);
    expect(resumed.controller.state.snapshot?.public.matchId).toBe(fresh.public.matchId);
    await players.host.controller.submit({ type: 'PLAYER_READY', ready: true }); await players.guest.controller.refresh();
    await players.guest.controller.submit({ type: 'PLAYER_READY', ready: true }); await players.host.controller.refresh();
    await players.host.controller.submit({ type: 'START_MATCH' });
    expect(generation).toBe(2); expect(room(players.code).public.scenario!.id).toContain('generation-2');
    expect(room(players.code).public.roundHistory).toEqual([]);
  });
  it('keeps a previously prepared old-match command from changing the rematch', async () => {
    const players = await game(); const original = room(players.code).public;
    const old = { actionId: crypto.randomUUID(), matchId: original.matchId, roundId: original.roundId, clueIndex: original.clueIndex, action: { type: 'ROLE_ACK' } };
    await finish(players); await pair(players, { type: 'REMATCH_REQUEST' });
    const before = structuredClone(db.values.get(`rooms/${players.code}`));
    expect(await createRoomService(db.store()).dispatchGameAction(players.code, 'host', old)).toMatchObject({ success: false });
    expect(db.values.get(`rooms/${players.code}`)).toEqual(before);
  });
});
