import { describe, expect, it } from 'vitest';
import { createDefaultRoundScenarios, createInitialGameState, processAction } from '../../lib/game/engine';
import type { GameAction, GameState } from '../../lib/game/types';
import { buildProjections } from '../../lib/server/roomProjection';
import { ROOM_SCHEMA_VERSION, type RoomRecord } from '../../lib/server/roomRecord';
import { decodeRoomRecord, InvalidRoomDataError } from '../../lib/server/roomSchema';
import { firebaseRoundTrip } from '../helpers/firebaseSerialization';

function apply(state: GameState, action: GameAction): GameState {
  const result = processAction(state, action);
  expect(result.success, result.error).toBe(true);
  return result.state;
}
function lobby(twoPlayers = true): GameState {
  let state = createInitialGameState('TEST23', 'match-fixture');
  state = apply(state, { type: 'PLAYER_JOIN', seat: 0, uid: 'host', displayName: 'หนึ่ง', avatarId: 'cat' });
  if (twoPlayers) state = apply(state, { type: 'PLAYER_JOIN', seat: 1, uid: 'guest', displayName: 'สอง', avatarId: 'fox' });
  return state;
}
function record(state: GameState): RoomRecord {
  const members: RoomRecord['members'] = {};
  for (const seat of state.seats) {
    if (seat) members[seat.uid] = {
      uid: seat.uid, seat: seat.seat, displayName: seat.displayName, avatarId: seat.avatarId, isHost: seat.isHost,
    };
  }
  return {
    schemaVersion: ROOM_SCHEMA_VERSION, code: state.roomId, members,
    ...buildProjections(state.roomId, state, members),
    server: {
      gameState: state,
      matchDeck: state.currentRound ? Array.from({ length: 4 }, (_, index) => createDefaultRoundScenarios(index)) : null,
      receipts: {}, expiresAt: 2_000_000_000_000,
    },
  };
}
function decode(state: GameState): RoomRecord {
  const result = decodeRoomRecord(firebaseRoundTrip(record(state)), state.roomId);
  expect(result).not.toBeNull();
  expect(result!.server.gameState).toEqual(state);
  return result!;
}
function start(): GameState {
  let state = lobby();
  state = apply(state, { type: 'PLAYER_READY', seat: 0, ready: true });
  state = apply(state, { type: 'PLAYER_READY', seat: 1, ready: true });
  return apply(state, { type: 'START_MATCH', rolePair: ['saver', 'comfort'] });
}
function deciding(): GameState {
  let state = start();
  for (const seat of [0, 1] as const) state = apply(state, { type: 'ROLE_ACK', seat });
  for (const seat of [0, 1] as const) state = apply(state, { type: 'SUBMIT_ANSWER', seat, clueIndex: 0, optionId: 'opt-a' });
  for (const seat of [0, 1] as const) state = apply(state, { type: 'REVEAL_ACK', seat, clueIndex: 0 });
  return state;
}

describe('Persisted room decoding through Firebase serialization', () => {
  it('restores the omitted second seat, empty collections and legacy version', () => {
    const original = record(lobby(false));
    const raw = firebaseRoundTrip(original) as Record<string, unknown>;
    delete raw.schemaVersion;
    const stored = raw.server as { gameState: Record<string, unknown>; receipts?: unknown; matchDeck?: unknown };
    expect(stored.gameState.seats).toHaveLength(1);
    expect(stored.gameState.currentRound).toBeUndefined();
    expect(stored.gameState.roundHistory).toBeUndefined();
    expect(stored.receipts).toBeUndefined();
    const normalized = decodeRoomRecord(raw, 'TEST23')!;
    expect(normalized.schemaVersion).toBe(1);
    expect(normalized).toEqual(original);
    expect(raw.schemaVersion).toBeUndefined(); // A read does not mutate/migrate input.
    const joined = processAction(normalized.server.gameState, {
      type: 'PLAYER_JOIN', seat: 1, uid: 'guest', displayName: 'สอง', avatarId: 'fox',
    });
    expect(joined.success).toBe(true);
  });

  it('supports sparse numeric maps, keeps seat 1 in place and preserves a zero clue index', () => {
    let state = apply(lobby(), { type: 'PLAYER_LEAVE', seat: 0 });
    const raw = firebaseRoundTrip(record(state)) as Record<string, unknown>;
    const stored = (raw.server as { gameState: Record<string, unknown> }).gameState;
    stored.seats = { 1: state.seats[1] };
    expect(decodeRoomRecord(raw, 'TEST23')!.server.gameState.seats).toEqual([null, state.seats[1]]);

    state = apply(deciding(), { type: 'SUBMIT_DECISION', seat: 1, clueIndex: 0, decision: { type: 'guess', roleId: 'saver' } });
    const normalized = decode(state);
    expect(normalized.server.gameState.currentRound!.guesses).toEqual([null, 'saver']);
    expect(normalized.server.gameState.currentRound!.guessClueIndex).toEqual([null, 0]);
    expect(normalized.private.guest.decisionSubmitted).toBe(true);
    expect(normalized.private.host.decisionSubmitted).toBe(false);
  });

  it('restores an entirely empty room and regenerates projections rather than trusting stored views', () => {
    const original = record(createInitialGameState('TEST23', 'empty-match'));
    const raw = firebaseRoundTrip(original) as Record<string, unknown>;
    raw.public = { phase: 'MATCH_RESULT', roles: ['saver', 'comfort'], internalRevision: 999 };
    raw.private = { outsider: { role: 'explorer' } };
    const normalized = decodeRoomRecord(raw, 'TEST23')!;
    expect(normalized).toEqual(original);
    expect(normalized.members).toEqual({});
    expect(normalized.private).toEqual({});
  });

  it('can reload after every action, play all four rounds, and rematch without missing fields', () => {
    let state = lobby();
    const seen = new Set([state.phase]);
    const step = (action: GameAction) => {
      state = apply(decode(state).server.gameState, action);
      state = decode(state).server.gameState;
      seen.add(state.phase);
    };
    step({ type: 'PLAYER_READY', seat: 0, ready: true });
    step({ type: 'PLAYER_READY', seat: 1, ready: true });
    step({ type: 'START_MATCH', rolePair: ['saver', 'comfort'] });
    for (let round = 0; round < 4; round++) {
      for (const seat of [0, 1] as const) step({ type: 'ROLE_ACK', seat });
      for (let clueIndex = 0; clueIndex < 4; clueIndex++) {
        for (const seat of [0, 1] as const) step({ type: 'SUBMIT_ANSWER', seat, clueIndex, optionId: 'opt-a' });
        for (const seat of [0, 1] as const) step({ type: 'REVEAL_ACK', seat, clueIndex });
        for (const seat of [0, 1] as const) {
          const earlyGuess = round === 0 && seat === 0;
          step({
            type: 'SUBMIT_DECISION', seat, clueIndex,
            decision: earlyGuess && clueIndex > 0 ? { type: 'ack' }
              : earlyGuess || clueIndex === 3 ? { type: 'guess', roleId: seat === 0 ? 'comfort' : 'saver' }
              : { type: 'continue' },
          });
        }
      }
      for (const seat of [0, 1] as const) step({ type: 'NEXT_ROUND_READY', seat, nextRolePair: ['saver', 'comfort'] });
    }
    expect(state.phase).toBe('MATCH_RESULT');
    expect(state.matchScores).toEqual([11, 8]);
    expect(state.roundHistory).toHaveLength(4);
    expect(seen).toEqual(new Set(['LOBBY', 'ROLE_INTRO', 'ANSWERING', 'ANSWER_REVEAL', 'DECIDING', 'ROUND_REVEAL', 'MATCH_RESULT']));
    step({ type: 'REMATCH_REQUEST', seat: 0 });
    expect(decode(state).private.host.rematchRequested).toBe(true);
    step({ type: 'REMATCH_REQUEST', seat: 1, nextMatchId: 'match-rematch' });
    expect(state.phase).toBe('LOBBY');
    expect(state.matchScores).toEqual([0, 0]);
    expect(state.currentRound).toBeNull();
  });

  it('returns caller submission/ack context without exposing the other player decision', () => {
    let state = start();
    state = apply(state, { type: 'ROLE_ACK', seat: 0 });
    expect(decode(state).private.host.roleAcknowledged).toBe(true);
    expect(decode(state).private.guest.roleAcknowledged).toBe(false);
    state = apply(state, { type: 'ROLE_ACK', seat: 1 });
    state = apply(state, { type: 'SUBMIT_ANSWER', seat: 0, clueIndex: 0, optionId: 'opt-a' });
    expect(decode(state).private.host.answerSubmitted).toBe(true);
    expect(decode(state).private.guest.answerSubmitted).toBe(false);
    state = apply(state, { type: 'SUBMIT_ANSWER', seat: 1, clueIndex: 0, optionId: 'opt-b' });
    state = apply(state, { type: 'REVEAL_ACK', seat: 0, clueIndex: 0 });
    expect(decode(state).private.host.revealAcknowledged).toBe(true);
    expect(decode(state).private.guest.revealAcknowledged).toBe(false);

    state = deciding();
    const before = decode(state);
    state = apply(state, { type: 'SUBMIT_DECISION', seat: 0, clueIndex: 0, decision: { type: 'guess', roleId: 'comfort' } });
    const after = decode(state);
    expect(after.public).toEqual(before.public);
    expect(after.private.guest).toEqual(before.private.guest);
    expect(after.private.host).toMatchObject({ decisionSubmitted: true, guess: 'comfort', guessClueIndex: 0 });
    expect(after.private.host.matchId).toBe(after.public.matchId);
    expect(after.private.host.roundId).toBe(after.public.roundId);
    expect(after.public).not.toHaveProperty('revision');
    expect(after.public).not.toHaveProperty('updatedAt');
  });

  it('restores a continue decision independently from hasGuessed and clears it for the next clue', () => {
    let state = deciding();
    const before = decode(state);
    state = apply(state, { type: 'SUBMIT_DECISION', seat: 0, clueIndex: 0, decision: { type: 'continue' } });
    let normalized = decode(state);
    expect(normalized.private.host).toMatchObject({ decisionSubmitted: true, hasGuessed: false, guess: null });
    expect(normalized.public).toEqual(before.public);
    expect(normalized.private.guest).toEqual(before.private.guest);
    state = apply(normalized.server.gameState, { type: 'SUBMIT_DECISION', seat: 1, clueIndex: 0, decision: { type: 'continue' } });
    normalized = decode(state);
    expect(normalized.public).toMatchObject({ phase: 'ANSWERING', clueIndex: 1 });
    expect(normalized.private.host).toMatchObject({ decisionSubmitted: false, answerSubmitted: false, clueIndex: 1 });
  });

  it('restores the next-round barrier and clears its flags when the next round starts', () => {
    let state = deciding();
    state = apply(state, { type: 'SUBMIT_DECISION', seat: 0, clueIndex: 0, decision: { type: 'guess', roleId: 'comfort' } });
    state = apply(state, { type: 'SUBMIT_DECISION', seat: 1, clueIndex: 0, decision: { type: 'guess', roleId: 'saver' } });
    state = apply(decode(state).server.gameState, { type: 'NEXT_ROUND_READY', seat: 0 });
    const waiting = decode(state);
    expect(waiting.public.phase).toBe('ROUND_REVEAL');
    expect(waiting.private.host.nextRoundReady).toBe(true);
    expect(waiting.private.guest.nextRoundReady).toBe(false);
    state = apply(waiting.server.gameState, { type: 'NEXT_ROUND_READY', seat: 1, nextRolePair: ['explorer', 'companion'] });
    const next = decode(state);
    expect(next.private.host.nextRoundReady).toBe(false);
    expect(next.private.host.roleAcknowledged).toBe(false);
    expect(next.private.host.roundId).not.toBe(waiting.private.host.roundId);
  });

  it('distinguishes absent rooms from malformed data without exposing stored secrets', () => {
    expect(decodeRoomRecord(null, 'TEST23')).toBeNull();
    for (const input of [undefined, false, [], {}, { server: { secret: 'secret-fixture' } }]) {
      expect(() => decodeRoomRecord(input, 'TEST23')).toThrow(InvalidRoomDataError);
      expect(() => decodeRoomRecord(input, 'TEST23')).not.toThrow('secret-fixture');
    }
  });

  it.each([
    ['future schema', (r: RoomRecord) => { r.schemaVersion = 99 as 1; }],
    ['wrong room', (r: RoomRecord) => { r.code = 'WRONG'; }],
    ['bad phase', (r: RoomRecord) => { r.server.gameState.phase = 'BROKEN' as 'LOBBY'; }],
    ['invalid score', (r: RoomRecord) => { r.server.gameState.matchScores[0] = -1; }],
    ['missing scores', (r: RoomRecord) => { Reflect.deleteProperty(r.server.gameState, 'matchScores'); }],
    ['missing active round', (r: RoomRecord) => { r.server.gameState.currentRound = null; }],
    ['missing active deck', (r: RoomRecord) => { r.server.matchDeck = null; }],
    ['missing ack flags', (r: RoomRecord) => { Reflect.deleteProperty(r.server.gameState.currentRound!, 'roleAcks'); }],
    ['unknown role', (r: RoomRecord) => { r.server.gameState.currentRound!.roles[0] = 'secret-fixture' as 'saver'; }],
    ['bad decision', (r: RoomRecord) => { r.server.gameState.currentRound!.currentDecisions[0] = { type: 'broken' } as unknown as { type: 'continue' }; }],
    ['member mismatch', (r: RoomRecord) => { r.members.host.seat = 1; }],
    ['unexpected third seat', (r: RoomRecord) => { Object.assign(r.server.gameState.seats, { 2: r.server.gameState.seats[0] }); }],
    ['history gap', (r: RoomRecord) => { r.server.gameState.roundHistory = [null!, null!]; r.server.gameState.roundHistory[1] = { roundIndex: 1 } as never; }],
  ])('rejects %s before the reducer can run', (_, corrupt) => {
    const input = record(start());
    corrupt(input);
    expect(() => decodeRoomRecord(firebaseRoundTrip(input), 'TEST23')).toThrow(InvalidRoomDataError);
  });
});
