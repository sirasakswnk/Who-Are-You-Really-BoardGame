import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { LEGACY_SCENARIOS, stripEditorial } from '../../content/legacy/scenarios';
import { SCENARIOS, ROUND_PACKS } from '../../content/scenarios';
import { createInitialGameState, processAction, getPlayerProjection } from '../../lib/game/engine';
import { generateRolePair, getAllRolePairs, canGuessRole } from '../../lib/game/roles';
import { ACTIVE_CONTENT_VERSION, LEGACY_CONTENT_VERSION, LEGACY_ROLE_IDS, ROLE_IDS, getRoleInfo, type GameState, type GameAction } from '../../lib/game/types';
import { createRoomService } from '../../lib/server/roomService';
import { decodeRoomRecord } from '../../lib/server/roomSchema';
import { createSnapshotMerger, decodePrivate } from '../../lib/client/roomSnapshot';
import { RoundNotes } from '../../lib/client/roundNotes';
import { readPending, savePending } from '../../lib/client/pendingAction';
import { fakeRTDB } from '../helpers/fakeRTDB';
import { tabStorage, clientSnapshot } from '../helpers/clientSnapshot';
import type { ClientCommand } from '../../lib/game/commands';

function apply(state: GameState, action: GameAction) {
  const result = processAction(state, action);
  expect(result.success, result.error).toBe(true);
  return result.state;
}
function readyLobby() {
  let state = createInitialGameState('ABC234', 'content-test');
  for (const seat of [0, 1] as const) {
    state = apply(state, { type: 'PLAYER_JOIN', seat, uid: seat ? 'guest' : 'host', displayName: `ผู้เล่น ${seat}`, avatarId: 'cat' });
    state = apply(state, { type: 'PLAYER_READY', seat, ready: true });
  }
  return state;
}

describe('Content compatibility and unchanged mechanics', () => {
  it('allows every role to choose every canonical option without points, automatic role reveal or opponent-answer leaks', () => {
    for (const role of ROLE_IDS) for (const scenario of SCENARIOS) for (const option of scenario.options) {
      const opponent = ROLE_IDS.find(id => id !== role)!;
      let state = apply(readyLobby(), { type: 'START_MATCH', rolePair: [role, opponent], scenarios: Array(4).fill(scenario) });
      for (const seat of [0, 1] as const) state = apply(state, { type: 'ROLE_ACK', seat });
      state = apply(state, { type: 'SUBMIT_ANSWER', seat: 0, clueIndex: 0, optionId: option.id });
      expect(state.phase).toBe('ANSWERING');
      expect(state.matchScores).toEqual([0, 0]);
      const opponentView = getPlayerProjection(state, 1);
      expect(opponentView.myCommittedAnswer).toBeNull();
      expect(opponentView.roundSummary).toBeNull();
      expect(opponentView.roundHistory).toEqual([]);
      state = apply(state, { type: 'SUBMIT_ANSWER', seat: 1, clueIndex: 0, optionId: option.id });
      expect(state.phase).toBe('ANSWER_REVEAL');
      expect(state.currentRound!.revealedAnswers[0].answers).toEqual([option.id, option.id]);
      expect(state.matchScores).toEqual([0, 0]);
    }
  });

  it('keeps legacy active rooms and locked actions through reload, next rounds and then switches rematch to the active packs', async () => {
    const db = fakeRTDB();
    const service = createRoomService(db.store(), { codeGenerator: () => 'ABC234', clock: () => 1_800_000_000_000,
      rolePair: (_rng, version) => generateRolePair(() => 0, version) });
    const { code } = await service.createRoom('host', 'หนึ่ง', 'cat');
    await service.joinRoom(code, 'guest', 'สอง', 'fox');
    const read = () => decodeRoomRecord(db.values.get(`rooms/${code}`), code)!;
    const send = async (uid: string, action: ClientCommand) => {
      const room = read();
      const envelope = { actionId: randomUUID(), matchId: room.public.matchId, roundId: room.public.roundId, clueIndex: room.public.clueIndex, action };
      const result = action.type === 'PLAYER_READY' ? await service.setPlayerReady(code, uid, action.ready, envelope)
        : action.type === 'START_MATCH' ? await service.startMatch(code, uid, envelope)
        : await service.dispatchGameAction(code, uid, envelope);
      expect(result.success, result.error).toBe(true);
    };
    await send('host', { type: 'PLAYER_READY', ready: true });
    await send('guest', { type: 'PLAYER_READY', ready: true });
    await send('host', { type: 'START_MATCH' });
    // Fixture represents a persisted pre-update room: original IDs and original content snapshots.
    const old = structuredClone(read());
    delete old.server.gameState.contentVersion;
    old.server.gameState.currentRound!.roles = ['saver', 'comfort'];
    const oldDeck = Array.from({ length: 4 }, (_, round) => LEGACY_SCENARIOS.slice(round * 4, round * 4 + 4).map(stripEditorial));
    old.server.matchDeck = oldDeck;
    old.server.gameState.currentRound!.scenarios = oldDeck[0];
    delete old.public.contentVersion;
    for (const own of Object.values(old.private)) delete own.contentVersion;
    db.put(`rooms/${code}`, old);
    const storedBefore = structuredClone(db.values.get(`rooms/${code}`));
    expect(read().server.gameState.contentVersion).toBe(LEGACY_CONTENT_VERSION);
    expect(db.values.get(`rooms/${code}`)).toEqual(storedBefore); // Read did not migrate Firebase.
    expect(getRoleInfo(read().private.host.role!).name).toBe('คนประหยัด');
    expect(read().server.matchDeck).toEqual(oldDeck);

    for (let round = 0; round < 4; round++) {
      expect(read().server.gameState.currentRound!.roles.every(id => LEGACY_ROLE_IDS.some(role => role === id))).toBe(true);
      expect(read().server.gameState.currentRound!.scenarios).toEqual(oldDeck[round]);
      for (const uid of ['host', 'guest']) await send(uid, { type: 'ROLE_ACK' });
      const clues = round === 0 ? 4 : 1;
      for (let clue = 0; clue < clues; clue++) {
        const room = read();
        const host = await service.getRoomProjections(code, 'host'), guest = await service.getRoomProjections(code, 'guest');
        expect(host.public.scenario).toEqual(guest.public.scenario);
        for (const uid of ['host', 'guest']) await send(uid, { type: 'SUBMIT_ANSWER', optionId: room.public.scenario!.options[0].id });
        for (const uid of ['host', 'guest']) await send(uid, { type: 'REVEAL_ACK' });
        const before = read();
        const roles = before.server.gameState.currentRound!.roles;
        await send('host', { type: 'SUBMIT_DECISION', decision: clue === 0 ? { type: 'guess', roleId: roles[1] } : { type: 'ack' } });
        expect(read().public).toEqual(before.public); // Private guess/status stays private, including revisions.
        expect(read().private.guest).toEqual(before.private.guest);
        const fresh = createSnapshotMerger(code, 'host');
        expect(fresh.pair(await service.getRoomProjections(code, 'host'))!.private.guess).toBe(roles[1]);
        await send('guest', { type: 'SUBMIT_DECISION', decision: round !== 0 || clue === 3 ? { type: 'guess', roleId: roles[0] } : { type: 'continue' } });
      }
      for (const uid of ['host', 'guest']) await send(uid, { type: 'NEXT_ROUND_READY' });
      expect(read().server.matchDeck).toEqual(oldDeck); // Early end never carries unused clues across rounds.
    }
    expect(read().public.phase).toBe('MATCH_RESULT');
    expect(read().public.matchScores).toEqual([20, 17]);
    for (const uid of ['host', 'guest']) await send(uid, { type: 'REMATCH_REQUEST' });
    expect(read().public.contentVersion).toBe(ACTIVE_CONTENT_VERSION);
    expect(read().server.matchDeck).toBeNull();
    for (const uid of ['host', 'guest']) await send(uid, { type: 'PLAYER_READY', ready: true });
    await send('host', { type: 'START_MATCH' });
    const current = read();
    for (const malformed of ['future-version', LEGACY_CONTENT_VERSION] as const) {
      const broken = structuredClone(current);
      Object.assign(broken.server.gameState, { contentVersion: malformed });
      expect(() => decodeRoomRecord(broken, code)).toThrow();
    }
    const mixed = structuredClone(current);
    mixed.server.gameState.currentRound!.roles[0] = 'saver';
    expect(() => decodeRoomRecord(mixed, code)).toThrow();
    expect(current.server.gameState.currentRound!.roles.every(id => ROLE_IDS.some(role => role === id))).toBe(true);
    expect(current.server.matchDeck!.every(round => ROUND_PACKS.some(pack => JSON.stringify(pack.scenarioIds) === JSON.stringify(round.map(s => s.id))))).toBe(true);
    const output = await service.getRoomProjections(code, 'guest');
    expect(output.public).not.toHaveProperty('matchDeck');
    expect(output.public).not.toHaveProperty('roles');
    expect(output.private.role).toBe(current.server.gameState.currentRound!.roles[1]);
    expect(JSON.stringify(output)).not.toContain('editorial');
  });

  it('starts an old unstarted lobby with new content and rejects cross-version guesses and malformed mixed catalogs', () => {
    const lobby = readyLobby(); delete lobby.contentVersion;
    const state = apply(lobby, { type: 'START_MATCH', rolePair: ['alien', 'spy'] });
    expect(state.contentVersion).toBe(ACTIVE_CONTENT_VERSION);
    expect(processAction(lobby, { type: 'START_MATCH', rolePair: ['saver', 'comfort'] }).success).toBe(false);
    expect(getAllRolePairs()).toHaveLength(30);
    expect(getAllRolePairs(LEGACY_CONTENT_VERSION)).toHaveLength(30);
    expect(canGuessRole('saver', 'alien')).toBe(false);
    expect(canGuessRole('alien', 'saver')).toBe(false);
    let deciding = state;
    for (const seat of [0, 1] as const) deciding = apply(deciding, { type: 'ROLE_ACK', seat });
    for (const seat of [0, 1] as const) deciding = apply(deciding, { type: 'SUBMIT_ANSWER', seat, clueIndex: 0, optionId: 'opt-a' });
    for (const seat of [0, 1] as const) deciding = apply(deciding, { type: 'REVEAL_ACK', seat, clueIndex: 0 });
    expect(processAction(deciding, { type: 'SUBMIT_DECISION', seat: 0, clueIndex: 0, decision: { type: 'guess', roleId: 'comfort' } }).success).toBe(false);
    const snapshot = clientSnapshot();
    expect(decodePrivate({ ...snapshot.private, role: 'saver' })).toBeNull();
    expect(createSnapshotMerger('ABC234', 'host').pair({ ...snapshot, private: { ...snapshot.private, contentVersion: LEGACY_CONTENT_VERSION, role: 'saver' } })).toBeNull();
  });

  it('preserves legacy pending guesses and scopes notes by content version, match and round without clearing auth', () => {
    const storage = tabStorage(), notify = vi.fn(), notes = new RoundNotes(storage, 'host', 'ABC234', notify);
    storage.setItem('firebase:authUser', 'preserve-session');
    const context = { matchId: 'match-test', roundId: 'match-test:round:0', revision: 1 };
    notes.activate(context); notes.toggle('comfort', 'suspect');
    const resumed = vi.fn(); new RoundNotes(storage, 'host', 'ABC234', resumed).activate(context);
    expect(resumed).toHaveBeenLastCalledWith({ comfort: 'suspect' });
    notes.activate({ ...context, contentVersion: ACTIVE_CONTENT_VERSION, revision: 2 });
    expect(notify).toHaveBeenLastCalledWith({});
    notes.toggle('spy', 'suspect'); notes.toggle('comfort', 'suspect');
    expect(notify).toHaveBeenLastCalledWith({ spy: 'suspect' });
    savePending(storage, { version: 1, uid: 'host', code: 'ABC234', envelope: { actionId: randomUUID(), ...context, clueIndex: 0,
      action: { type: 'SUBMIT_DECISION', decision: { type: 'guess', roleId: 'comfort' } } } });
    expect(readPending(storage, 'host', 'ABC234')!.envelope.action).toEqual({ type: 'SUBMIT_DECISION', decision: { type: 'guess', roleId: 'comfort' } });
    expect(storage.getItem('firebase:authUser')).toBe('preserve-session');
  });
});
