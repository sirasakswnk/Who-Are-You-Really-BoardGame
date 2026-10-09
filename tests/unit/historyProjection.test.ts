import { describe, it, expect } from 'vitest';
import { createInitialGameState, createDefaultRoundScenarios, processAction } from '../../lib/game/engine';
import type { GameState, GameAction } from '../../lib/game/types';
import { buildProjections } from '../../lib/server/roomProjection';
import { decodePublic } from '../../lib/client/roomSnapshot';
import { clientSnapshot } from '../helpers/clientSnapshot';
import { firebaseRoundTrip } from '../helpers/firebaseSerialization';

function apply(state: GameState, action: GameAction) {
  const result = processAction(state, action); expect(result.success, result.error).toBe(true); return result.state;
}
function views(state: GameState) {
  const members = Object.fromEntries(state.seats.filter(player => player !== null).map(player => [player.uid, player]));
  return buildProjections(state.roomId, state, members);
}
function answering() {
  let state = createInitialGameState('ABC234', 'fixture-match');
  for (const seat of [0, 1] as const) {
    state = apply(state, { type: 'PLAYER_JOIN', seat, uid: seat === 0 ? 'host' : 'guest', displayName: 'ผู้เล่น', avatarId: 'cat' });
    state = apply(state, { type: 'PLAYER_READY', seat, ready: true });
  }
  state = apply(state, { type: 'START_MATCH', rolePair: ['saver', 'comfort'], scenarios: createDefaultRoundScenarios(0) });
  for (const seat of [0, 1] as const) state = apply(state, { type: 'ROLE_ACK', seat });
  return state;
}
function complete(state: GameState) {
  for (const seat of [0, 1] as const) state = apply(state, { type: 'SUBMIT_ANSWER', seat, clueIndex: 0, optionId: seat === 0 ? 'opt-a' : 'opt-b' });
  for (const seat of [0, 1] as const) state = apply(state, { type: 'REVEAL_ACK', seat, clueIndex: 0 });
  for (const seat of [0, 1] as const) state = apply(state, { type: 'SUBMIT_DECISION', seat, clueIndex: 0, decision: { type: 'guess', roleId: seat === 0 ? 'comfort' : 'saver' } });
  return state;
}
describe('F06 history projection boundaries and compatibility', () => {
  it('publishes labels only after both answers reveal and never publishes future scenario snapshots', () => {
    let state = answering(); state = apply(state, { type: 'SUBMIT_ANSWER', seat: 0, clueIndex: 0, optionId: 'opt-a' });
    expect(views(state).public.revealedEvidence).toEqual([]); expect(views(state).public.roundHistory).toEqual([]);
    state = apply(state, { type: 'SUBMIT_ANSWER', seat: 1, clueIndex: 0, optionId: 'opt-b' });
    const pub = views(state).public;
    expect(pub.revealedEvidence).toHaveLength(1); expect(pub.revealedEvidence[0].answers).toEqual(['ทางเลือก A สำหรับสถานการณ์ที่ 1', 'ทางเลือก B สำหรับสถานการณ์ที่ 1']);
    expect(pub.roundHistory).toEqual([]); expect(JSON.stringify(pub)).not.toContain('สถานการณ์ที่ 2');
    expect(JSON.stringify(pub)).not.toContain('comfort'); expect(JSON.stringify(pub)).not.toContain('saver');
  });
  it('keeps published prior-round details while the current round roles and decisions remain private', () => {
    let state = complete(answering());
    state = apply(state, { type: 'NEXT_ROUND_READY', seat: 0 });
    state = apply(state, { type: 'NEXT_ROUND_READY', seat: 1, nextRolePair: ['explorer', 'companion'], nextScenarios: createDefaultRoundScenarios(1) });
    const pub = views(state).public;
    expect(pub.roundHistory).toHaveLength(1); expect(pub.roundHistory[0].roles).toEqual(['saver', 'comfort']);
    expect(JSON.stringify(pub)).not.toContain('explorer'); expect(JSON.stringify(pub)).not.toContain('companion');
    expect(pub.revealedEvidence).toEqual([]);
  });
  it('recovers last-round legacy evidence where still present and labels unavailable older evidence honestly', () => {
    let state = complete(answering()); delete state.roundHistory[0].evidence;
    expect(views(state).public.roundHistory[0].evidence).toHaveLength(1);
    state = apply(state, { type: 'NEXT_ROUND_READY', seat: 0 });
    state = apply(state, { type: 'NEXT_ROUND_READY', seat: 1, nextRolePair: ['explorer', 'companion'], nextScenarios: createDefaultRoundScenarios(1) });
    expect(views(state).public.roundHistory[0].evidence).toEqual([]);
  });
  it('retains numeric map evidence tuples through RTDB decoding with a zero clue index', () => {
    const pub = views(complete(answering())).public;
    const decoded = decodePublic(firebaseRoundTrip(pub), 'ABC234');
    expect(decoded?.roundHistory).toEqual(pub.roundHistory); expect(decoded?.roundSummary).toEqual(pub.roundSummary);
    expect(decoded?.revealedEvidence[0].clueIndex).toBe(0);
  });
  it('rejects malformed/future revealed history instead of displaying it', () => {
    const pub = views(complete(answering())).public;
    for (const change of [{ revealedEvidence: 'bad' }, { roundHistory: 'bad' },
      { revealedEvidence: [{ ...pub.revealedEvidence[0], clueIndex: 3 }] },
      { roundHistory: [{ ...pub.roundHistory[0], evidence: [{ ...pub.revealedEvidence[0], answers: { 0: 'missing second answer' } }] }] }]) {
      expect(decodePublic({ ...pub, ...change }, 'ABC234')).toBeNull();
    }
    expect(decodePublic({ ...clientSnapshot().public, roundHistory: pub.roundHistory }, 'ABC234')).toBeNull();
  });
});
