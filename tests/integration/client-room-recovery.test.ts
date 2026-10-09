import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoomService } from '../../lib/server/roomService';
import * as roomStore from '../../lib/server/roomStore';
import { RoomSession } from '../../lib/client/roomSession';
import { createRoomApi } from '../../lib/client/roomApi';
import { POST as readyRoute } from '../../app/api/room/ready/route';
import { POST as startRoute } from '../../app/api/room/start/route';
import { POST as actionRoute } from '../../app/api/game/action/route';
import { POST as leaveRoute } from '../../app/api/room/leave/route';
import { GET as getRoute } from '../../app/api/room/[code]/route';
import { tabStorage } from '../helpers/clientSnapshot';
import { fakeRTDB } from '../helpers/fakeRTDB';

let db: ReturnType<typeof fakeRTDB>;
const controllers: RoomSession[] = [];
beforeEach(() => {
  db = fakeRTDB();
  vi.spyOn(roomStore, 'getRoomStore').mockImplementation(() => db.store());
});
afterEach(() => { controllers.splice(0).forEach(controller => controller.dispose()); vi.restoreAllMocks(); });
async function createRoom() {
  const service = createRoomService(db.store());
  const { code } = await service.createRoom('host', 'หนึ่ง', 'cat');
  await service.joinRoom(code, 'guest', 'สอง', 'fox'); return code;
}
function client(code: string, uid: string, options: { storage?: ReturnType<typeof tabStorage>; losePostResponse?: boolean } = {}) {
  let lose = !!options.losePostResponse;
  const calls: Array<{ path: string; body?: string }> = [];
  const transport: typeof fetch = async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    const request = new Request(url, init);
    calls.push({ path: url.pathname, body: init?.body as string | undefined });
    let response: Response;
    if (init?.method === 'GET') response = await getRoute(request, { params: Promise.resolve({ code }) });
    else {
      const handler = url.pathname === '/api/room/leave' ? leaveRoute : url.pathname === '/api/room/ready' ? readyRoute : url.pathname === '/api/room/start' ? startRoute : actionRoute;
      response = await handler(request);
      if (lose) { lose = false; throw new Error('Committed response lost'); }
    }
    return response;
  };
  const user = { uid, getIdToken: async () => `mock-token-${uid}` };
  const controller = new RoomSession(code, uid, createRoomApi(() => user, uid, transport), options.storage ?? tabStorage(), vi.fn());
  controllers.push(controller);
  return { controller, calls };
}
async function players() {
  const code = await createRoom(), host = client(code, 'host'), guest = client(code, 'guest');
  await host.controller.start(); await guest.controller.start();
  await host.controller.submit({ type: 'PLAYER_READY', ready: true });
  await guest.controller.submit({ type: 'PLAYER_READY', ready: true });
  await host.controller.refresh(); await host.controller.submit({ type: 'START_MATCH' });
  await guest.controller.refresh();
  return { code, host, guest };
}
async function answering() {
  const room = await players();
  await room.host.controller.submit({ type: 'ROLE_ACK' });
  await room.guest.controller.submit({ type: 'ROLE_ACK' });
  await room.host.controller.refresh();
  return room;
}
async function deciding() {
  const room = await answering(), optionId = room.host.controller.state.snapshot!.public.scenario!.options[0].id;
  await room.host.controller.submit({ type: 'SUBMIT_ANSWER', optionId });
  await room.guest.controller.submit({ type: 'SUBMIT_ANSWER', optionId });
  await room.host.controller.refresh();
  await room.host.controller.submit({ type: 'REVEAL_ACK' });
  await room.guest.controller.submit({ type: 'REVEAL_ACK' });
  await room.host.controller.refresh();
  return room;
}

describe('Client sessions through real routes, engine, CAS and Firebase serialization', () => {
  it('confirms host departure via HTTP before leaving and shows abandonment to the remaining player after reload', async () => {
    const { code, host, guest } = await answering();
    await host.controller.leave(); expect(host.controller.state.left).toBe(true);
    await guest.controller.refresh();
    expect(guest.controller.state.snapshot?.public).toMatchObject({ phase: 'ABANDONED', termination: { seat: 0, displayName: 'หนึ่ง' }, matchScores: [0, 0] });
    const resumed = client(code, 'guest'); await resumed.controller.start();
    expect(resumed.controller.state.snapshot?.public.phase).toBe('ABANDONED');
    const writes = db.roomWrites; await resumed.controller.submit({ type: 'SUBMIT_ANSWER', optionId: 'a' });
    expect(db.roomWrites).toBe(writes); await resumed.controller.leave(); expect(resumed.controller.state.left).toBe(true);
  });
  it('recovers a lost HTTP leave response after reload using its receipt with no membership left', async () => {
    const code = await createRoom(), storage = tabStorage(), host = client(code, 'host', { storage, losePostResponse: true });
    await host.controller.start(); await host.controller.leave();
    expect(host.controller.state.left).toBe(false); expect(host.controller.state.pending?.envelope.action.type).toBe('PLAYER_LEAVE');
    host.controller.dispose(); const writes = db.roomWrites;
    const resumed = client(code, 'host', { storage }); await resumed.controller.start();
    expect(resumed.controller.state.left).toBe(true); expect(db.roomWrites).toBe(writes);
    expect(host.calls.find(call => call.body)?.body).toBe(resumed.calls.find(call => call.body)?.body);
    expect(storage.values.size).toBe(0);
  });
  it('updates a seat-one host through realtime-independent API fallback after the seat-zero host leaves', async () => {
    const code = await createRoom(), host = client(code, 'host'), guest = client(code, 'guest');
    await host.controller.start(); await guest.controller.start(); await host.controller.leave(); await guest.controller.refresh();
    expect(guest.controller.state.snapshot).toMatchObject({ seat: 1, isHost: true, public: { phase: 'LOBBY', players: [null, { uid: 'guest', ready: false }] } });
  });
  it('resumes role and reveal acknowledgements after reload without an extra action', async () => {
    const { code, host, guest } = await players();
    await host.controller.submit({ type: 'ROLE_ACK' });
    const resumedRole = client(code, 'host'); await resumedRole.controller.start();
    expect(resumedRole.controller.state.snapshot?.private.roleAcknowledged).toBe(true);
    await resumedRole.controller.submit({ type: 'ROLE_ACK' });
    expect(resumedRole.calls.filter(call => call.body)).toHaveLength(0);
    await guest.controller.submit({ type: 'ROLE_ACK' }); await host.controller.refresh();
    const optionId = host.controller.state.snapshot!.public.scenario!.options[0].id;
    await host.controller.submit({ type: 'SUBMIT_ANSWER', optionId });
    await guest.controller.submit({ type: 'SUBMIT_ANSWER', optionId });
    await host.controller.refresh(); await host.controller.submit({ type: 'REVEAL_ACK' });
    const resumedReveal = client(code, 'host'); await resumedReveal.controller.start();
    expect(resumedReveal.controller.state.snapshot?.private.revealAcknowledged).toBe(true);
    await resumedReveal.controller.submit({ type: 'REVEAL_ACK' });
    expect(resumedReveal.calls.filter(call => call.body)).toHaveLength(0);
  });
  it('refreshes after continue and preserves the submitted decision while waiting', async () => {
    const { code, host, guest } = await deciding();
    await host.controller.submit({ type: 'SUBMIT_DECISION', decision: { type: 'continue' } });
    const resumed = client(code, 'host'); await resumed.controller.start();
    expect(resumed.controller.state.snapshot?.private.decisionSubmitted).toBe(true);
    await resumed.controller.submit({ type: 'SUBMIT_DECISION', decision: { type: 'continue' } });
    expect(resumed.calls.filter(call => call.body)).toHaveLength(0);
    await guest.controller.submit({ type: 'SUBMIT_DECISION', decision: { type: 'continue' } });
    await resumed.controller.refresh();
    expect(resumed.controller.state.snapshot?.public).toMatchObject({ phase: 'ANSWERING', clueIndex: 1 });
    expect(resumed.controller.state.snapshot?.private.decisionSubmitted).toBe(false);
  });
  it('refreshes after a guess, still answers the next clue and submits only ack', async () => {
    const { code, host, guest } = await deciding();
    const role = guest.controller.state.snapshot!.private.role!;
    await host.controller.submit({ type: 'SUBMIT_DECISION', decision: { type: 'guess', roleId: role } });
    const resumed = client(code, 'host'); await resumed.controller.start();
    expect(resumed.controller.state.snapshot?.private).toMatchObject({ hasGuessed: true, guess: role, decisionSubmitted: true });
    await resumed.controller.submit({ type: 'SUBMIT_DECISION', decision: { type: 'continue' } });
    expect(resumed.calls.filter(call => call.body)).toHaveLength(0);
    await guest.controller.submit({ type: 'SUBMIT_DECISION', decision: { type: 'continue' } }); await resumed.controller.refresh();
    const optionId = resumed.controller.state.snapshot!.public.scenario!.options[0].id;
    await resumed.controller.submit({ type: 'SUBMIT_ANSWER', optionId });
    await guest.controller.submit({ type: 'SUBMIT_ANSWER', optionId }); await resumed.controller.refresh();
    await resumed.controller.submit({ type: 'REVEAL_ACK' }); await guest.controller.submit({ type: 'REVEAL_ACK' }); await resumed.controller.refresh();
    expect(resumed.controller.state.snapshot?.private.decisionSubmitted).toBe(false);
    await resumed.controller.submit({ type: 'SUBMIT_DECISION', decision: { type: 'ack' } });
    expect(resumed.controller.state.snapshot?.private).toMatchObject({ guess: role, guessClueIndex: 0, decisionSubmitted: true });
  });
  it('recovers an answer after losing the committed HTTP response and never replaces its identity', async () => {
    const { code } = await answering(), storage = tabStorage(), host = client(code, 'host', { storage, losePostResponse: true });
    await host.controller.start();
    const optionId = host.controller.state.snapshot!.public.scenario!.options[0].id;
    await host.controller.submit({ type: 'SUBMIT_ANSWER', optionId });
    expect(host.controller.state.pending).toBeNull();
    expect(host.controller.state.snapshot?.private).toMatchObject({ answerSubmitted: true, committedAnswer: optionId });
    expect(host.controller.state.actionError).toBeNull();
    await host.controller.submit({ type: 'SUBMIT_ANSWER', optionId: 'another-option' });
    expect(host.calls.filter(call => call.body)).toHaveLength(1);
    expect(storage.values.size).toBe(0);
  });
  it('restores next-round readiness without another command or duplicate scores', async () => {
    const { code, host, guest } = await deciding();
    const hostRole = host.controller.state.snapshot!.private.role!, guestRole = guest.controller.state.snapshot!.private.role!;
    await host.controller.submit({ type: 'SUBMIT_DECISION', decision: { type: 'guess', roleId: guestRole } });
    await guest.controller.submit({ type: 'SUBMIT_DECISION', decision: { type: 'guess', roleId: hostRole } });
    await host.controller.refresh(); await host.controller.submit({ type: 'NEXT_ROUND_READY' });
    const resumed = client(code, 'host'); await resumed.controller.start();
    expect(resumed.controller.state.snapshot?.private.nextRoundReady).toBe(true);
    expect(resumed.controller.state.snapshot?.public.matchScores).toEqual([5, 5]);
    await resumed.controller.submit({ type: 'NEXT_ROUND_READY' }); expect(resumed.calls.filter(call => call.body)).toHaveLength(0);
    await guest.controller.submit({ type: 'NEXT_ROUND_READY' }); await resumed.controller.refresh();
    expect(resumed.controller.state.snapshot?.public).toMatchObject({ phase: 'ROLE_INTRO', roundIndex: 1, clueIndex: 0, matchScores: [5, 5] });
    expect(resumed.controller.state.snapshot?.private.nextRoundReady).toBe(false);
  });
});
