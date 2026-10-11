import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoomApi } from '../../lib/client/roomApi';
import { RoomSession } from '../../lib/client/roomSession';
import { decodeRoomRecord } from '../../lib/server/roomSchema';
import * as roomStore from '../../lib/server/roomStore';
import * as roles from '../../lib/game/roles';
import { fakeRTDB } from '../helpers/fakeRTDB';
import { tabStorage } from '../helpers/clientSnapshot';
import type { ClientCommand } from '../../lib/game/commands';
import { POST as createRoute } from '../../app/api/room/create/route';
import { POST as joinRoute } from '../../app/api/room/join/route';
import { POST as readyRoute } from '../../app/api/room/ready/route';
import { POST as startRoute } from '../../app/api/room/start/route';
import { POST as actionRoute } from '../../app/api/game/action/route';
import { POST as leaveRoute } from '../../app/api/room/leave/route';
import { GET as getRoute } from '../../app/api/room/[code]/route';

let db: ReturnType<typeof fakeRTDB>;
const sessions: RoomSession[] = [];
beforeEach(() => {
  db = fakeRTDB(); vi.spyOn(roomStore, 'getRoomStore').mockImplementation(() => db.store());
  vi.spyOn(roles, 'generateRolePair').mockReturnValue(['alien', 'spy']);
});
afterEach(() => { sessions.splice(0).forEach(session => session.dispose()); vi.restoreAllMocks(); });
const request = (uid: string, body: unknown) => new Request('http://localhost/api/test', { method: 'POST',
  headers: { Authorization: `Bearer mock-token-${uid}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
async function fixture() {
  const created = await createRoute(request('host', { displayName: 'หนึ่ง', avatarId: 'cat' })); expect(created.status).toBe(200);
  const { code } = await created.json() as { code: string };
  expect((await joinRoute(request('guest', { code, displayName: 'สอง', avatarId: 'fox' }))).status).toBe(200);
  const room = () => decodeRoomRecord(db.values.get(`rooms/${code}`), code)!;
  let blockReads = false, lose: ClientCommand['type'] | null = null;
  const posts: Array<{ uid: string; body: Record<string, unknown> }> = [];
  const player = (uid: string, storage = tabStorage()) => {
    const user = { uid, getIdToken: async () => `mock-token-${uid}` };
    const transport: typeof fetch = async (input, init) => {
      const url = new URL(String(input), 'http://localhost'), req = new Request(url, init);
      if (init?.method === 'GET') {
        if (blockReads) return Response.json({ error: 'simulated read unavailable', retryable: true }, { status: 503 });
        return getRoute(req, { params: Promise.resolve({ code }) });
      }
      const body = JSON.parse(String(init?.body)); posts.push({ uid, body });
      const route = url.pathname === '/api/room/ready' ? readyRoute : url.pathname === '/api/room/start' ? startRoute
        : url.pathname === '/api/room/leave' ? leaveRoute : actionRoute;
      const response = await route(req);
      if (lose && body.action?.type === lose) { lose = null; throw new Error('Lost response after real handler commit'); }
      return response;
    };
    const session = new RoomSession(code, uid, createRoomApi(() => user, uid, transport), storage, () => {});
    sessions.push(session); return session;
  };
  let host = player('host'), guest = player('guest'); await Promise.all([host.start(), guest.start()]);
  const refresh = () => Promise.all([host.refreshFresh(), guest.refreshFresh()]);
  const reload = async () => {
    host.dispose(); guest.dispose(); host = player('host'); guest = player('guest');
    await Promise.all([host.start(), guest.start()]);
    expect(host.state.actionBlocked).toBe(false); expect(guest.state.actionBlocked).toBe(false);
    expect(host.state.snapshot?.public).toEqual(room().public); expect(guest.state.snapshot?.public).toEqual(room().public);
  };
  const pair = async (action: ClientCommand) => { await refresh(); await Promise.all([host.submit(action), guest.submit(action)]); await refresh(); };
  await pair({ type: 'PLAYER_READY', ready: true }); await host.submit({ type: 'START_MATCH' }); await refresh();
  return { code, room, player, refresh, reload, pair, posts, get host() { return host; }, get guest() { return guest; },
    lose: (type: ClientCommand['type']) => { lose = type; }, blockReads: (value: boolean) => { blockReads = value; } };
}

describe('F08 client → actual routes → independent CAS transports acceptance', () => {
  it('finishes asymmetric four-round scoring, wrong and forced guesses, reloads every barrier and starts a clean rematch', async () => {
    const f = await fixture(), timings = [[0, 3], [3, 0], [1, 2], [2, 1]], scores = [[5, 2], [2, 5], [4, 0], [3, 4]];
    for (let round = 0; round < 4; round++) {
      expect(f.room().public.phase).toBe('ROLE_INTRO'); await f.reload(); await f.pair({ type: 'ROLE_ACK' });
      for (let clue = 0; clue <= Math.max(...timings[round]); clue++) {
        expect(f.room().public.phase).toBe('ANSWERING'); await f.reload();
        const options = f.room().public.scenario!.options;
        await f.host.submit({ type: 'SUBMIT_ANSWER', optionId: options[0].id }); await f.host.refreshFresh();
        expect(f.host.state.snapshot?.private.answerSubmitted).toBe(true); expect(f.room().public.phase).toBe('ANSWERING');
        expect(f.room().private.guest.committedAnswer).toBeNull();
        await f.guest.submit({ type: 'SUBMIT_ANSWER', optionId: options[1].id }); await f.refresh();
        expect(f.room().public.phase).toBe('ANSWER_REVEAL'); await f.reload(); await f.pair({ type: 'REVEAL_ACK' });
        expect(f.room().public.phase).toBe('DECIDING'); await f.reload();
        if (clue === 3) {
          const uid = timings[round][0] === 3 ? 'host' : 'guest', client = uid === 'host' ? f.host : f.guest;
          const before = f.room().server.revision;
          await client.submit({ type: 'SUBMIT_DECISION', decision: { type: 'continue' } });
          expect(client.state.actionError?.retryable).toBe(false); expect(f.room().server.revision).toBe(before);
          expect(f.room().public.phase).toBe('DECIDING');
        }
        const command = (seat: 0 | 1): ClientCommand => ({ type: 'SUBMIT_DECISION', decision: clue < timings[round][seat] ? { type: 'continue' }
          : clue > timings[round][seat] ? { type: 'ack' } : { type: 'guess', roleId: round === 2 && seat === 1 ? 'vampire' : seat === 0 ? 'spy' : 'alien' } });
        await Promise.all([f.host.submit(command(0)), f.guest.submit(command(1))]); await f.refresh();
        expect(f.host.state.actionError, `host round=${round} clue=${clue}`).toBeNull();
        expect(f.guest.state.actionError, `guest round=${round} clue=${clue}`).toBeNull();
        if (clue < Math.max(...timings[round])) expect(f.room().public.phase).toBe('ANSWERING');
      }
      expect(f.room().public.phase).toBe('ROUND_REVEAL'); expect(f.room().public.roundSummary?.scores).toEqual(scores[round]);
      expect(f.room().public.roundHistory).toHaveLength(round + 1); await f.reload(); await f.pair({ type: 'NEXT_ROUND_READY' });
    }
    await f.reload(); expect(f.room().public).toMatchObject({ phase: 'MATCH_RESULT', matchScores: [14, 11] });
    const oldMatch = f.room().public.matchId, oldSnapshot = structuredClone(f.host.state.snapshot!);
    await f.host.submit({ type: 'REMATCH_REQUEST' }); await f.reload(); expect(f.room().public.phase).toBe('MATCH_RESULT');
    expect(f.host.state.snapshot?.private.rematchRequested).toBe(true);
    await f.guest.submit({ type: 'REMATCH_REQUEST' }); await f.refresh();
    expect(f.room().public.matchId).not.toBe(oldMatch);
    expect(f.room().public).toMatchObject({ phase: 'LOBBY', matchScores: [0, 0], roundHistory: [], rematchRequests: [false, false] });
    f.host.receive('public', oldSnapshot.public); f.host.receive('private', oldSnapshot.private);
    expect(f.host.state.snapshot?.public.matchId).toBe(f.room().public.matchId);
    await f.pair({ type: 'PLAYER_READY', ready: true }); await f.host.submit({ type: 'START_MATCH' }); await f.refresh();
    expect(f.room().public.phase).toBe('ROLE_INTRO'); expect(f.room().public.roundHistory).toEqual([]);
  });
  it('reloads a durable pending answer after lost POST plus failed GET without creating another receipt or accepting an alternate answer', async () => {
    const f = await fixture(); await f.pair({ type: 'ROLE_ACK' });
    const storage = tabStorage(), tab = f.player('host', storage); await tab.start();
    const options = f.room().public.scenario!.options; f.lose('SUBMIT_ANSWER'); f.blockReads(true);
    await tab.submit({ type: 'SUBMIT_ANSWER', optionId: options[0].id });
    expect(tab.state.pending).not.toBeNull(); const id = tab.state.pending!.envelope.actionId;
    tab.dispose(); f.blockReads(false);
    const resumed = f.player('host', storage); await resumed.start(); expect(resumed.state.pending).toBeNull();
    expect(resumed.state.snapshot?.private.committedAnswer).toBe(options[0].id);
    await resumed.submit({ type: 'SUBMIT_ANSWER', optionId: options[1].id });
    expect(f.posts.filter(post => post.uid === 'host' && (post.body.action as ClientCommand | undefined)?.type === 'SUBMIT_ANSWER')).toHaveLength(1);
    expect(Object.values(f.room().server.receipts).filter(receipt => receipt.uid === 'host' && receipt.type === 'SUBMIT_ANSWER')).toHaveLength(1);
    expect(f.posts.find(post => post.body.actionId === id)).toBeDefined();
    await f.guest.submit({ type: 'SUBMIT_ANSWER', optionId: options[1].id }); await f.refresh();
    expect(f.room().public.phase).toBe('ANSWER_REVEAL'); expect(f.room().public.revealedAnswers[0].answers).toEqual([options[0].id, options[1].id]);
  });
});
