import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoomService } from '../../lib/server/roomService';
import * as roomStore from '../../lib/server/roomStore';
import { decodeRoomRecord } from '../../lib/server/roomSchema';
import { parseEnvelope, MAX_REQUEST_BYTES } from '../../lib/server/commandSchema';
import { RATE_LIMITS } from '../../lib/server/rateLimit';
import { newActionId, type ClientCommand, type ActionEnvelope } from '../../lib/game/commands';
import { POST as actionRoute } from '../../app/api/game/action/route';
import { POST as readyRoute } from '../../app/api/room/ready/route';
import { POST as startRoute } from '../../app/api/room/start/route';
import { POST as createRoute } from '../../app/api/room/create/route';
import { POST as joinRoute } from '../../app/api/room/join/route';
import { GET as getRoute } from '../../app/api/room/[code]/route';
import { fakeRTDB } from '../helpers/fakeRTDB';

let db: ReturnType<typeof fakeRTDB>;
let now: number;
const instance = () => createRoomService(db.store(), { clock: () => now, rolePair: () => ['alien', 'spy'] });
const room = (code: string) => decodeRoomRecord(db.values.get(`rooms/${code}`), code)!;
function context(code: string) {
  const view = room(code).public;
  return { actionId: randomUUID(), matchId: view.matchId, roundId: view.roundId, clueIndex: view.clueIndex };
}
const envelope = (code: string, action: ClientCommand): ActionEnvelope => ({ ...context(code), action });
const send = (code: string, uid: string, action: ClientCommand) => instance().dispatchGameAction(code, uid, envelope(code, action));
async function pair(code: string, action: ClientCommand) {
  // Capture the same committed context before either request advances it.
  const first = envelope(code, action), second = envelope(code, action);
  return Promise.all([instance().dispatchGameAction(code, 'host', first), instance().dispatchGameAction(code, 'guest', second)]);
}
async function lobby() {
  const { code } = await instance().createRoom('host', 'หนึ่ง', 'cat');
  await instance().joinRoom(code, 'guest', 'สอง', 'fox');
  return code;
}
async function start(code: string) {
  await instance().setPlayerReady(code, 'host', true, context(code));
  await instance().setPlayerReady(code, 'guest', true, context(code));
  expect(await instance().startMatch(code, 'host', context(code))).toEqual({ success: true });
}
async function answering() {
  const code = await lobby(); await start(code); await pair(code, { type: 'ROLE_ACK' });
  return code;
}
async function deciding(code: string) {
  const optionId = room(code).public.scenario!.options[0].id;
  await pair(code, { type: 'SUBMIT_ANSWER', optionId });
  await pair(code, { type: 'REVEAL_ACK' });
}
function request(path: string, body: unknown, uid = 'host') {
  return new Request(`http://localhost${path}`, {
    method: 'POST', headers: { Authorization: `Bearer mock-token-${uid}` }, body: JSON.stringify(body),
  });
}
beforeEach(() => {
  db = fakeRTDB(); now = Date.now();
  vi.spyOn(roomStore, 'getRoomStore').mockImplementation(() => db.store());
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Runtime command boundary', () => {
  it.each([
    { type: 'START_MATCH' },
    { type: 'START_MATCH', rolePair: ['alien', 'spy'], scenarios: [] },
    { type: 'PLAYER_JOIN', uid: 'host', seat: 0 },
    { type: 'PLAYER_LEAVE', seat: 0 },
    { type: 'PLAYER_READY', ready: true },
    { type: 'ROLE_ACK', seat: 1 },
    { type: 'NEXT_ROUND_READY', nextRolePair: ['alien', 'spy'] },
    { type: 'SUBMIT_ANSWER', optionId: 'x', clueIndex: 0 },
    { type: 'SUBMIT_DECISION', decision: { type: 'invented' } },
    { type: 'SUBMIT_DECISION', decision: { type: 'guess', roleId: 'invented' } },
    { type: 'SUBMIT_DECISION', decision: { type: 'continue', roleId: 'alien' } },
    { type: 'SUBMIT_ANSWER', optionId: 'x'.repeat(129) },
  ])('rejects untrusted command %j before writing', async action => {
    const code = await lobby();
    const before = structuredClone(db.values.get(`rooms/${code}`));
    const writes = db.writes;
    const response = await actionRoute(request('/api/game/action', { code, ...context(code), action }, 'guest'));
    expect(response.status).toBe(400);
    expect(db.writes).toBe(writes);
    expect(db.values.get(`rooms/${code}`)).toEqual(before);
  });
  it.each([
    { actionId: 'old-timestamp-id' }, { matchId: '' }, { roundId: undefined }, { clueIndex: '0' },
    { clueIndex: -1 }, { clueIndex: 4 }, { clueIndex: 0.5 }, { uid: 'guest' }, { scores: [99, 99] },
  ])('rejects malformed envelope %j', change => {
    const base = { actionId: randomUUID(), matchId: 'match', roundId: null, clueIndex: 0, action: { type: 'ROLE_ACK' } };
    expect(() => parseEnvelope({ ...base, ...change })).toThrow();
  });
  it('rejects guest start, forged identity and server material on dedicated routes', async () => {
    const code = await lobby();
    await instance().setPlayerReady(code, 'host', true, context(code));
    await instance().setPlayerReady(code, 'guest', true, context(code));
    const before = structuredClone(db.values.get(`rooms/${code}`));
    for (const [uid, extra] of [['guest', {}], ['host', { rolePair: ['alien', 'spy'] }], ['guest', { uid: 'host' }]] as const) {
      const response = await startRoute(request('/api/room/start', { code, ...context(code), ...extra }, uid));
      expect(response.status).toBe(400);
    }
    expect(db.values.get(`rooms/${code}`)).toEqual(before);
  });
  it.each(['true', 1, null, undefined])('requires an actual ready boolean: %j', async ready => {
    const code = await lobby();
    const response = await readyRoute(request('/api/room/ready', { code, ...context(code), ready }));
    expect(response.status).toBe(400);
    expect(room(code).public.players[0]?.ready).toBe(false);
  });
  it.each([
    { displayName: ' '.repeat(4), avatarId: 'cat' },
    { displayName: 'ก'.repeat(21), avatarId: 'cat' },
    { displayName: 'name\nother', avatarId: 'cat' },
    { displayName: 'หนึ่ง', avatarId: 'forged' },
    { displayName: 'หนึ่ง', avatarId: { toString: null } },
    { displayName: 'หนึ่ง', avatarId: 'cat', isHost: true },
  ])('rejects invalid profile %j on create/join', async profile => {
    expect((await createRoute(request('/api/room/create', profile))).status).toBe(400);
    expect((await joinRoute(request('/api/room/join', { code: 'ABC234', ...profile }))).status).toBe(400);
    expect(db.writes).toBe(0);
  });
  it('returns 400 for invalid JSON and 413 for actual oversized chunked bytes', async () => {
    const invalid = new Request('http://localhost/api/game/action', {
      method: 'POST', headers: { Authorization: 'Bearer mock-token-host' }, body: '{invalid',
    });
    expect((await actionRoute(invalid)).status).toBe(400);
    const stream = new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(new Uint8Array(MAX_REQUEST_BYTES / 2));
      controller.enqueue(new Uint8Array(MAX_REQUEST_BYTES)); controller.close();
    } });
    const oversized = new Request('http://localhost/api/game/action', {
      method: 'POST', headers: { Authorization: 'Bearer mock-token-host' }, body: stream, duplex: 'half',
    } as RequestInit);
    expect((await actionRoute(oversized)).status).toBe(413);
    expect(db.writes).toBe(0);
  });
  it('generates distinct UUIDs across tabs with the HTTP fallback', () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) });
    const ids = Array.from({ length: 100 }, newActionId);
    expect(new Set(ids).size).toBe(100);
    for (const actionId of ids) expect(() => parseEnvelope({ actionId, matchId: 'm', roundId: null, clueIndex: 0, action: { type: 'ROLE_ACK' } })).not.toThrow();
  });
});

describe('Authorization, immutable submissions and bound receipts', () => {
  it('recovers ready/start retries after the phase changed and rejects changed ready payload', async () => {
    const code = await lobby();
    const hostReady = context(code);
    await instance().setPlayerReady(code, 'host', true, hostReady);
    expect((await instance().setPlayerReady(code, 'host', false, hostReady)).success).toBe(false);
    await instance().setPlayerReady(code, 'guest', true, context(code));
    const startRequest = context(code);
    await instance().startMatch(code, 'host', startRequest);
    const before = structuredClone(db.values.get(`rooms/${code}`));
    expect(await instance().setPlayerReady(code, 'host', true, hostReady)).toEqual({ success: true });
    expect(await instance().startMatch(code, 'host', startRequest)).toEqual({ success: true });
    expect(db.values.get(`rooms/${code}`)).toEqual(before);
  });
  it('rejects non-members inside the committed transaction', async () => {
    const code = await answering();
    expect(await instance().dispatchGameAction(code, 'outsider', envelope(code, { type: 'ROLE_ACK' }))).toMatchObject({ success: false, error: 'Not a member of this room' });
  });
  it('rejects an option outside the current scenario without corrupting the room', async () => {
    const code = await answering();
    const before = structuredClone(db.values.get(`rooms/${code}`));
    expect(await send(code, 'host', { type: 'SUBMIT_ANSWER', optionId: 'not-in-scenario' })).toMatchObject({ success: false });
    expect(db.values.get(`rooms/${code}`)).toEqual(before);
    expect((await send(code, 'host', { type: 'SUBMIT_ANSWER', optionId: room(code).public.scenario!.options[0].id })).success).toBe(true);
  });
  it('locks the first valid answer even when two tabs use distinct UUIDs', async () => {
    const code = await answering();
    const options = room(code).public.scenario!.options.slice(0, 2);
    const choices = options.map(option => envelope(code, { type: 'SUBMIT_ANSWER', optionId: option.id }));
    const results = await Promise.all(choices.map(choice => instance().dispatchGameAction(code, 'host', choice)));
    expect(results.filter(result => result.success)).toHaveLength(1);
    expect(room(code).private.host.committedAnswer).toBe(options[results.findIndex(result => result.success)].id);
  });
  it('separates the same UUID used by different players and replays after phase advancement', async () => {
    const code = await answering();
    const first = envelope(code, { type: 'SUBMIT_ANSWER', optionId: room(code).public.scenario!.options[0].id });
    const second = { ...first, action: { type: 'SUBMIT_ANSWER', optionId: room(code).public.scenario!.options[1].id } } as ActionEnvelope;
    expect(await Promise.all([instance().dispatchGameAction(code, 'host', first), instance().dispatchGameAction(code, 'guest', second)])).toEqual([{ success: true }, { success: true }]);
    const committed = structuredClone(db.values.get(`rooms/${code}`)), writes = db.roomWrites;
    expect(await instance().dispatchGameAction(code, 'host', first)).toEqual({ success: true });
    expect(await instance().dispatchGameAction(code, 'guest', second)).toEqual({ success: true });
    expect(db.roomWrites).toBe(writes);
    expect(db.values.get(`rooms/${code}`)).toEqual(committed);
    expect(Object.values(room(code).server.receipts).filter(receipt => receipt.type === 'SUBMIT_ANSWER')).toHaveLength(2);
  });
  it('does not treat another actor\'s receipt as their own completed submission', async () => {
    const code = await answering();
    const first = envelope(code, { type: 'SUBMIT_ANSWER', optionId: room(code).public.scenario!.options[0].id });
    await instance().dispatchGameAction(code, 'host', first);
    expect(await instance().dispatchGameAction(code, 'guest', { ...first, action: { type: 'ROLE_ACK' } })).toMatchObject({ success: false });
    expect(room(code).private.guest.answerSubmitted).toBe(false);
  });
  it('rejects changed payload/context with the original UUID, including same action type', async () => {
    const code = await answering();
    const first = envelope(code, { type: 'SUBMIT_ANSWER', optionId: room(code).public.scenario!.options[0].id });
    await instance().dispatchGameAction(code, 'host', first);
    for (const change of [{ action: { type: 'SUBMIT_ANSWER', optionId: room(code).public.scenario!.options[1].id } }, { matchId: 'other' }, { roundId: 'other' }, { clueIndex: 1 }]) {
      expect(await instance().dispatchGameAction(code, 'host', { ...first, ...change })).toMatchObject({ success: false, error: 'Duplicate actionId with mismatched payload' });
    }
  });
  it('locks the first guess, rejects own-role guess and requires ack after a previous guess', async () => {
    const code = await answering(); await deciding(code);
    expect((await send(code, 'host', { type: 'SUBMIT_DECISION', decision: { type: 'guess', roleId: 'alien' } })).success).toBe(false);
    const guess = envelope(code, { type: 'SUBMIT_DECISION', decision: { type: 'guess', roleId: 'spy' } });
    expect((await instance().dispatchGameAction(code, 'host', guess)).success).toBe(true);
    expect((await send(code, 'host', { type: 'SUBMIT_DECISION', decision: { type: 'guess', roleId: 'vampire' } })).success).toBe(false);
    expect((await instance().dispatchGameAction(code, 'host', { ...guess, action: { type: 'SUBMIT_DECISION', decision: { type: 'continue' } } })).success).toBe(false);
    await send(code, 'guest', { type: 'SUBMIT_DECISION', decision: { type: 'continue' } });
    expect(room(code).public.clueIndex).toBe(1);
    await deciding(code); // Both players, including the earlier guesser, must answer.
    expect((await send(code, 'host', { type: 'SUBMIT_DECISION', decision: { type: 'continue' } })).success).toBe(false);
    expect((await send(code, 'host', { type: 'SUBMIT_DECISION', decision: { type: 'guess', roleId: 'vampire' } })).success).toBe(false);
    expect((await send(code, 'host', { type: 'SUBMIT_DECISION', decision: { type: 'ack' } })).success).toBe(true);
    expect(room(code).private.host.guess).toBe('spy');
  });
  it('forces unguessed players to guess at the final clue', async () => {
    const code = await answering();
    for (let clue = 0; clue < 3; clue++) {
      await deciding(code); await pair(code, { type: 'SUBMIT_DECISION', decision: { type: 'continue' } });
    }
    await deciding(code);
    expect(room(code).public.clueIndex).toBe(3);
    expect((await send(code, 'host', { type: 'SUBMIT_DECISION', decision: { type: 'continue' } })).success).toBe(false);
    expect((await send(code, 'host', { type: 'SUBMIT_DECISION', decision: { type: 'ack' } })).success).toBe(false);
    expect((await send(code, 'host', { type: 'SUBMIT_DECISION', decision: { type: 'guess', roleId: 'spy' } })).success).toBe(true);
  });
  it('never trusts an unbound legacy receipt as proof of success', async () => {
    const code = await lobby();
    const action = envelope(code, { type: 'ROLE_ACK' });
    const legacy = room(code);
    legacy.server.receipts[action.actionId] = { type: 'ROLE_ACK', timestamp: now };
    db.put(`rooms/${code}`, legacy);
    expect((await instance().dispatchGameAction(code, 'host', action)).success).toBe(false);
  });
  it('bounds the receipt ledger without evicting proof needed for an existing retry', async () => {
    const code = await answering();
    const command = envelope(code, { type: 'SUBMIT_ANSWER', optionId: room(code).public.scenario!.options[0].id });
    await instance().dispatchGameAction(code, 'host', command);
    const current = room(code);
    const count = Object.keys(current.server.receipts).length;
    for (let index = count; index < 4096; index++) current.server.receipts[`legacy-${index}`] = { type: 'ROLE_ACK', timestamp: now };
    db.put(`rooms/${code}`, current);
    const before = structuredClone(db.values.get(`rooms/${code}`));
    expect(await instance().dispatchGameAction(code, 'host', command)).toEqual({ success: true });
    expect((await send(code, 'guest', { type: 'SUBMIT_ANSWER', optionId: room(code).public.scenario!.options[0].id })).success).toBe(false);
    expect(db.values.get(`rooms/${code}`)).toEqual(before);
  });
});

describe('Stale contexts and rematch identity', () => {
  it.each([{ matchId: 'old-match' }, { roundId: 'old-round' }, { clueIndex: 1 }])('rejects stale %j before reducing', async change => {
    const code = await answering();
    const before = structuredClone(db.values.get(`rooms/${code}`));
    expect((await instance().dispatchGameAction(code, 'host', { ...envelope(code, { type: 'SUBMIT_ANSWER', optionId: room(code).public.scenario!.options[0].id }), ...change })).success).toBe(false);
    expect(db.values.get(`rooms/${code}`)).toEqual(before);
  });
  it('plays four rounds, assigns a fresh rematch identity, and rejects old commands at the same phase/index', async () => {
    const code = await lobby();
    const oldReady = context(code), oldStart = context(code), oldMatch = room(code).public.matchId;
    await start(code);
    const oldRoleAck = envelope(code, { type: 'ROLE_ACK' });
    const ids = new Set<string>();
    for (let round = 0; round < 4; round++) {
      ids.add(room(code).public.roundId!);
      await pair(code, { type: 'ROLE_ACK' });
      await deciding(code);
      const hostGuess = envelope(code, { type: 'SUBMIT_DECISION', decision: { type: 'guess', roleId: 'spy' } });
      const guestGuess = envelope(code, { type: 'SUBMIT_DECISION', decision: { type: 'guess', roleId: 'alien' } });
      await Promise.all([instance().dispatchGameAction(code, 'host', hostGuess), instance().dispatchGameAction(code, 'guest', guestGuess)]);
      const before = structuredClone(db.values.get(`rooms/${code}`));
      expect(await instance().dispatchGameAction(code, 'host', hostGuess)).toEqual({ success: true });
      expect(db.values.get(`rooms/${code}`)).toEqual(before);
      await pair(code, { type: 'NEXT_ROUND_READY' });
      if (round < 3) expect((await instance().dispatchGameAction(code, 'host', { ...oldRoleAck, actionId: randomUUID() })).success).toBe(false);
    }
    expect(ids.size).toBe(4);
    expect(room(code).public).toMatchObject({ phase: 'MATCH_RESULT', matchScores: [20, 20] });
    await send(code, 'host', { type: 'REMATCH_REQUEST' });
    const rematch = envelope(code, { type: 'REMATCH_REQUEST' });
    await instance().dispatchGameAction(code, 'guest', rematch);
    const fresh = room(code);
    expect(fresh.public.matchId).not.toBe(oldMatch);
    expect(fresh.public).toMatchObject({ phase: 'LOBBY', roundId: null, matchScores: [0, 0] });
    expect(fresh.server.matchDeck).toBeNull();
    expect(fresh.private.host).toMatchObject({ role: null, guess: null, decisionSubmitted: false });
    expect((await instance().setPlayerReady(code, 'host', true, oldReady)).success).toBe(false);
    expect((await instance().startMatch(code, 'host', oldStart)).success).toBe(false);
    await start(code);
    expect(ids.has(room(code).public.roundId!)).toBe(false);
    expect((await instance().dispatchGameAction(code, 'host', oldRoleAck)).success).toBe(false);
    const before = structuredClone(db.values.get(`rooms/${code}`));
    expect(await instance().dispatchGameAction(code, 'guest', rematch)).toEqual({ success: true });
    expect(db.values.get(`rooms/${code}`)).toEqual(before);
  });
});

describe('Shared rate limits across independent server instances', () => {
  it('limits concurrent distinct creates for one actor while allowing another actor and the next window', async () => {
    for (let index = 0; index < RATE_LIMITS.create - 1; index++) await instance().createRoom('host', 'หนึ่ง', 'cat');
    const last = await Promise.allSettled(Array.from({ length: 3 }, () => instance().createRoom('host', 'หนึ่ง', 'cat')));
    expect(last.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    for (const result of last) if (result.status === 'rejected') expect(result.reason).toMatchObject({ status: 429, retryable: true });
    expect((await createRoute(request('/api/room/create', { displayName: 'หนึ่ง', avatarId: 'cat' }))).status).toBe(429);
    expect((await instance().createRoom('another', 'สอง', 'fox')).seat).toBe(0);
    now += 60_000;
    expect((await instance().createRoom('host', 'หนึ่ง', 'cat')).seat).toBe(0);
  });
  it('limits valid-shaped game requests across rooms, including non-member attempts', async () => {
    const first = await lobby(), second = await lobby();
    for (let index = 0; index < RATE_LIMITS.game; index++) {
      await instance().dispatchGameAction(index % 2 ? first : second, 'outsider', envelope(first, { type: 'ROLE_ACK' }));
    }
    const response = await actionRoute(request('/api/game/action', { code: first, ...envelope(first, { type: 'ROLE_ACK' }) }, 'outsider'));
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ retryable: true });
  });
  it('bounds readiness writes and polling separately', async () => {
    const code = await lobby();
    for (let index = 0; index < RATE_LIMITS.room; index++) await instance().setPlayerReady(code, 'host', index % 2 === 0, context(code));
    expect((await readyRoute(request('/api/room/ready', { code, ...context(code), ready: true }))).status).toBe(429);
    for (let index = 0; index < RATE_LIMITS.read; index++) await instance().getRoomProjections(code, 'host');
    const response = await getRoute(new Request(`http://localhost/api/room/${code}`, { headers: { Authorization: 'Bearer mock-token-host' } }), { params: Promise.resolve({ code }) });
    expect(response.status).toBe(429);
  });
  it('also bounds reads for nonexistent rooms before fetching the room', async () => {
    for (let index = 0; index < RATE_LIMITS.read; index++) {
      await expect(instance().getRoomProjections('ABC234', 'outsider')).rejects.toMatchObject({ status: 404 });
    }
    await expect(instance().getRoomProjections('ABC234', 'outsider')).rejects.toMatchObject({ status: 429 });
  });
});
