import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultRoundScenarios } from '../../lib/game/engine';
import { createRoomService, memoryRooms } from '../helpers/testClient';
import { createFirebaseRoomStore, getRoomStore, RoomStorageError } from '../../lib/server/roomStore';
import { decodeRoomRecord } from '../../lib/server/roomSchema';
import { fakeRTDB } from '../helpers/fakeRTDB';

let db: ReturnType<typeof fakeRTDB>;
const instance = (options: Parameters<typeof createRoomService>[1] = {}) => createRoomService(db.store(), options);
const room = (code: string) => decodeRoomRecord(db.values.get(`rooms/${code}`), code)!;
beforeEach(() => { db = fakeRTDB(); memoryRooms.clear(); });

async function answering() {
  const { code } = await instance().createRoom('host', 'หนึ่ง', 'cat');
  await instance().joinRoom(code, 'guest', 'สอง', 'fox');
  await Promise.all([instance().setPlayerReady(code, 'host', true), instance().setPlayerReady(code, 'guest', true)]);
  await instance({ rolePair: () => ['alien', 'spy'] }).startMatch(code, 'host');
  await Promise.all([
    instance().dispatchGameAction(code, 'host', 'ack-host', { type: 'ROLE_ACK', seat: 0 }),
    instance().dispatchGameAction(code, 'guest', 'ack-guest', { type: 'ROLE_ACK', seat: 1 }),
  ]);
  return code;
}
async function deciding() {
  const code = await answering();
  const scenario = room(code).public.scenario!;
  await Promise.all([
    instance().dispatchGameAction(code, 'host', 'answer-host', { type: 'SUBMIT_ANSWER', seat: 0, clueIndex: 0, optionId: scenario.options[0].id }),
    instance().dispatchGameAction(code, 'guest', 'answer-guest', { type: 'SUBMIT_ANSWER', seat: 1, clueIndex: 0, optionId: scenario.options[1].id }),
  ]);
  await Promise.all([
    instance().dispatchGameAction(code, 'host', 'reveal-host', { type: 'REVEAL_ACK', seat: 0, clueIndex: 0 }),
    instance().dispatchGameAction(code, 'guest', 'reveal-guest', { type: 'REVEAL_ACK', seat: 1, clueIndex: 0 }),
  ]);
  return code;
}

describe('Database authoritative state across independent instances', () => {
  it('reads fresh committed state despite a poisoned memory cache', async () => {
    const { code } = await instance().createRoom('host', 'หนึ่ง', 'cat');
    const stale = room(code);
    memoryRooms.set(code, stale);
    await instance().joinRoom(code, 'guest', 'สอง', 'fox');
    expect((await instance().getRoomProjections(code, 'host')).public.players[1]?.uid).toBe('guest');
    expect(memoryRooms.get(code)!.public.players[1]).toBeNull();
    await expect(instance().getRoomProjections(code, 'outsider')).rejects.toMatchObject({ status: 403 });
  });
  it('allows exactly one of two simultaneous joiners to claim the remaining seat', async () => {
    const { code } = await instance().createRoom('host', 'หนึ่ง', 'cat');
    const results = await Promise.all([
      instance().joinRoom(code, 'guest-a', 'สอง A', 'fox'),
      instance().joinRoom(code, 'guest-b', 'สอง B', 'owl'),
    ]);
    expect(results.filter(r => r.success)).toHaveLength(1);
    expect(Object.keys(room(code).members)).toHaveLength(2);
    expect(db.conflicts).toBeGreaterThan(0);
  });
  it('retains both concurrent answers and exactly one reveal', async () => {
    const code = await answering();
    const scenario = room(code).public.scenario!;
    const results = await Promise.all([
      instance().dispatchGameAction(code, 'host', 'answer-host', { type: 'SUBMIT_ANSWER', seat: 0, clueIndex: 0, optionId: scenario.options[0].id }),
      instance().dispatchGameAction(code, 'guest', 'answer-guest', { type: 'SUBMIT_ANSWER', seat: 1, clueIndex: 0, optionId: scenario.options[1].id }),
    ]);
    expect(results).toEqual([{ success: true }, { success: true }]);
    expect(room(code).public.phase).toBe('ANSWER_REVEAL');
    expect(room(code).public.revealedAnswers).toEqual([{ clueIndex: 0, answers: scenario.options.slice(0, 2).map(o => o.id) }]);
  });
  it('scores once when decisions and duplicate receipts race', async () => {
    const code = await deciding();
    const results = await Promise.all([
      ...Array.from({ length: 4 }, () => instance().dispatchGameAction(code, 'host', 'guess-host', { type: 'SUBMIT_DECISION', seat: 0, clueIndex: 0, decision: { type: 'guess', roleId: 'spy' } })),
      instance().dispatchGameAction(code, 'guest', 'guess-guest', { type: 'SUBMIT_DECISION', seat: 1, clueIndex: 0, decision: { type: 'guess', roleId: 'alien' } }),
    ]);
    expect(results.every(r => r.success)).toBe(true);
    expect(room(code).server.gameState.matchScores).toEqual([5, 5]);
    expect(room(code).server.gameState.roundHistory).toHaveLength(1);
  });
  it('preserves secret-independent view revisions while advancing the server revision', async () => {
    const code = await deciding();
    const before = room(code);
    await instance().dispatchGameAction(code, 'host', 'guess-host', { type: 'SUBMIT_DECISION', seat: 0, clueIndex: 0, decision: { type: 'guess', roleId: 'spy' } });
    const after = room(code);
    expect(after.server.revision).toBe(before.server.revision! + 1);
    expect(after.public).toEqual(before.public);
    expect(after.private.guest).toEqual(before.private.guest);
    expect(after.private.host.revision).toBe(before.private.host.revision! + 1);
    const writes = db.roomWrites;
    await instance().dispatchGameAction(code, 'host', 'guess-host', { type: 'SUBMIT_DECISION', seat: 0, clueIndex: 0, decision: { type: 'guess', roleId: 'spy' } });
    expect(db.roomWrites).toBe(writes);
  });
  it('prepares deck and roles once even when CAS retries repeatedly', async () => {
    const { code } = await instance().createRoom('host', 'หนึ่ง', 'cat');
    await instance().joinRoom(code, 'guest', 'สอง', 'fox');
    await instance().setPlayerReady(code, 'host', true);
    await instance().setPlayerReady(code, 'guest', true);
    const rolePair = vi.fn(() => ['alien', 'spy'] as ['alien', 'spy']);
    const deck = vi.fn(() => Array.from({ length: 4 }, (_, i) => createDefaultRoundScenarios(i)));
    db.forceConflicts(3, `rooms/${code}`);
    expect(await instance({ rolePair, deck }).startMatch(code, 'host')).toEqual({ success: true });
    expect(rolePair).toHaveBeenCalledOnce();
    expect(deck).toHaveBeenCalledOnce();
  });
});

describe('Atomic room code claims and create recovery', () => {
  it('retries collisions without overwriting the existing room', async () => {
    await instance({ codeGenerator: () => 'ABC234' }).createRoom('host', 'หนึ่ง', 'cat');
    const existing = structuredClone(db.values.get('rooms/ABC234'));
    const codes = ['ABC234', 'DEF567'];
    const result = await instance({ codeGenerator: () => codes.shift()! }).createRoom('other', 'ใหม่', 'owl');
    expect(result.code).toBe('DEF567');
    expect(db.values.get('rooms/ABC234')).toEqual(existing);
  });
  it('converges concurrent retries of the same create request to one room', async () => {
    const results = await Promise.all(Array.from({ length: 4 }, () => instance().createRoom('host', 'หนึ่ง', 'cat', 'same-create')));
    expect(new Set(results.map(r => r.code)).size).toBe(1);
    expect([...db.values.keys()].filter(k => k.startsWith('rooms/'))).toHaveLength(1);
    await expect(instance().createRoom('host', 'changed', 'cat', 'same-create')).rejects.toMatchObject({ status: 409 });
  });
  it('separates simultaneous distinct creates that initially select the same code', async () => {
    const leftCodes = ['ABC234', 'DEF567'];
    const rightCodes = ['ABC234', 'GHJ678'];
    const results = await Promise.all([
      instance({ codeGenerator: () => leftCodes.shift()! }).createRoom('left', 'ซ้าย', 'cat', 'left-request'),
      instance({ codeGenerator: () => rightCodes.shift()! }).createRoom('right', 'ขวา', 'fox', 'right-request'),
    ]);
    expect(new Set(results.map(r => r.code)).size).toBe(2);
    expect(room(results[0].code).members.left.uid).toBe('left');
    expect(room(results[1].code).members.right.uid).toBe('right');
    expect([...db.values.keys()].filter(k => k.startsWith('rooms/'))).toHaveLength(2);
  });
  it('recovers a create whose room commit succeeded but response was lost', async () => {
    db.loseResponse('rooms/ABC234');
    await expect(instance({ codeGenerator: () => 'ABC234' }).createRoom('host', 'หนึ่ง', 'cat', 'lost-create')).rejects.toBeInstanceOf(RoomStorageError);
    const original = structuredClone(db.values.get('rooms/ABC234'));
    expect(await instance().createRoom('host', 'หนึ่ง', 'cat', 'lost-create')).toEqual({ code: 'ABC234', seat: 0 });
    expect(db.values.get('rooms/ABC234')).toEqual(original);
  });
  it('does not report successful creation or mutate local memory on write failure', async () => {
    db.rejectWrites(true);
    await expect(instance().createRoom('host', 'หนึ่ง', 'cat', 'failed-create')).rejects.toBeInstanceOf(RoomStorageError);
    expect(db.values.size).toBe(0);
    expect(memoryRooms.size).toBe(0);
  });
  it('recovers a lost reservation response before the room has been claimed', async () => {
    let lost = false;
    db.onPut(path => {
      if (path.startsWith('roomCreationRequests/') && !lost) {
        lost = true;
        throw new Error('Reservation response lost after commit');
      }
    });
    await expect(instance({ codeGenerator: () => 'ABC234' }).createRoom('host', 'หนึ่ง', 'cat', 'lost-reservation')).rejects.toBeInstanceOf(RoomStorageError);
    expect(db.values.has('rooms/ABC234')).toBe(false);
    expect(await instance().createRoom('host', 'หนึ่ง', 'cat', 'lost-reservation')).toEqual({ code: 'ABC234', seat: 0 });
  });
  it('retains the reserved identity when the subsequent room claim fails', async () => {
    db.onPut(path => {
      if (path.startsWith('roomCreationRequests/')) db.rejectWrites(true);
    });
    await expect(instance({ codeGenerator: () => 'ABC234' }).createRoom('host', 'หนึ่ง', 'cat', 'claim-failed')).rejects.toBeInstanceOf(RoomStorageError);
    expect(db.values.has('rooms/ABC234')).toBe(false);
    db.rejectWrites(false);
    expect(await instance().createRoom('host', 'หนึ่ง', 'cat', 'claim-failed')).toEqual({ code: 'ABC234', seat: 0 });
  });
});

describe('Persistence failure and uncertain outcomes', () => {
  it('does not report success or change state when an action write fails', async () => {
    const code = await answering();
    const before = structuredClone(db.values.get(`rooms/${code}`));
    db.rejectWrites(true);
    await expect(instance().dispatchGameAction(code, 'host', 'failed-answer', { type: 'SUBMIT_ANSWER', seat: 0, clueIndex: 0, optionId: room(code).public.scenario!.options[0].id })).rejects.toBeInstanceOf(RoomStorageError);
    expect(db.values.get(`rooms/${code}`)).toEqual(before);
  });
  it('recovers action receipts after losing a committed response without submitting twice', async () => {
    const code = await answering();
    const action = { type: 'SUBMIT_ANSWER', seat: 0, clueIndex: 0, optionId: room(code).public.scenario!.options[0].id } as const;
    db.loseResponse(`rooms/${code}`);
    await expect(instance().dispatchGameAction(code, 'host', 'lost-answer', action)).rejects.toBeInstanceOf(RoomStorageError);
    const committed = structuredClone(db.values.get(`rooms/${code}`));
    expect(await instance().dispatchGameAction(code, 'host', 'lost-answer', action)).toEqual({ success: true });
    expect(db.values.get(`rooms/${code}`)).toEqual(committed);
  });
  it('aborts a timed-out response after commit and recovers the original receipt', async () => {
    const code = await answering();
    const action = { type: 'SUBMIT_ANSWER', seat: 0, clueIndex: 0, optionId: room(code).public.scenario!.options[0].id } as const;
    db.timeoutResponse(`rooms/${code}`);
    const timed = createRoomService(db.store(20));
    await expect(timed.dispatchGameAction(code, 'host', 'timeout-answer', action)).rejects.toBeInstanceOf(RoomStorageError);
    const committed = structuredClone(db.values.get(`rooms/${code}`));
    expect(await instance().dispatchGameAction(code, 'host', 'timeout-answer', action)).toEqual({ success: true });
    expect(db.values.get(`rooms/${code}`)).toEqual(committed);
  });
  it('stops after bounded conflicts without treating an uncommitted action as success', async () => {
    const code = await answering();
    const before = structuredClone(db.values.get(`rooms/${code}`));
    db.forceConflicts(32, `rooms/${code}`);
    await expect(instance().dispatchGameAction(code, 'host', 'conflicted-answer', {
      type: 'SUBMIT_ANSWER', seat: 0, clueIndex: 0, optionId: room(code).public.scenario!.options[0].id,
    })).rejects.toBeInstanceOf(RoomStorageError);
    expect(db.values.get(`rooms/${code}`)).toEqual(before);
  });
  it('bounds requests and rejects a missing ETag or transport failure', async () => {
    const noTag = createFirebaseRoomStore({ databaseURL: 'https://fake.invalid', accessToken: async () => 'test', fetch: async () => Response.json(null) });
    await expect(noTag.read('rooms/ABC234')).rejects.toBeInstanceOf(RoomStorageError);
    const offline = createFirebaseRoomStore({ databaseURL: 'https://fake.invalid', accessToken: async () => 'test', fetch: async () => { throw new Error('offline'); } });
    await expect(offline.read('rooms/ABC234')).rejects.toBeInstanceOf(RoomStorageError);
    const neverToken = createFirebaseRoomStore({ databaseURL: 'https://fake.invalid', accessToken: () => new Promise(() => {}), timeoutMs: 10 });
    await expect(neverToken.read('rooms/ABC234')).rejects.toBeInstanceOf(RoomStorageError);
  });
  it('does not fall back to memory outside isolated tests if credentials are missing', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('FIREBASE_DATABASE_EMULATOR_HOST', '');
    try { expect(() => getRoomStore()).toThrow(RoomStorageError); }
    finally { vi.unstubAllEnvs(); }
  });
});
