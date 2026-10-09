import {
  CLUES_PER_ROUND, ROUNDS_PER_MATCH, ROLE_IDS,
  type DecisionAction, type GamePhase, type GameState, type PlayerSeat,
  type RoleId, type RoundResult, type RoundState, type Scenario, type RevealedEvidence,
} from '../game/types';
import { ROOM_SCHEMA_VERSION, type RoomRecord } from './roomRecord';
import { buildProjections } from './roomProjection';

/** Safe to expose to a caller; never includes persisted values or secrets. */
export class InvalidRoomDataError extends Error {
  constructor() {
    super('ข้อมูลห้องไม่สมบูรณ์หรือเป็นเวอร์ชันที่ไม่รองรับ กรุณาสร้างห้องใหม่');
    this.name = 'InvalidRoomDataError';
  }
}

function invalid(): never { throw new InvalidRoomDataError(); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  return typeof value === 'string' ? value : invalid();
}
function identifier(value: unknown): string {
  const result = text(value);
  return result.length ? result : invalid();
}
function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max
    ? value : invalid();
}
function boolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : invalid();
}
function nullable<T>(value: unknown, decode: (item: unknown) => T): T | null {
  return value == null ? null : decode(value);
}

/** RTDB can return dense arrays, sparse numeric maps, or null for empty nodes. */
function numericEntries(value: unknown): Record<string, unknown> {
  if (value == null) return {};
  if (typeof value !== 'object') return invalid();
  const entries = Object.entries(value);
  if (entries.some(([key]) => !/^(0|[1-9]\d*)$/.test(key))) return invalid();
  return Object.fromEntries(entries);
}
function pair<T>(value: unknown, decode: (item: unknown) => T): [T, T] {
  const entries = numericEntries(value);
  if (Object.keys(entries).some(key => key !== '0' && key !== '1')) return invalid();
  return [decode(entries['0']), decode(entries['1'])];
}
function list<T>(value: unknown, decode: (item: unknown) => T): T[] {
  const entries = numericEntries(value);
  const keys = Object.keys(entries).sort((a, b) => Number(a) - Number(b));
  if (keys.some((key, index) => Number(key) !== index)) return invalid();
  return keys.map(key => decode(entries[key]));
}
function role(value: unknown): RoleId {
  return ROLE_IDS.includes(value as RoleId) ? value as RoleId : invalid();
}
const clue = (value: unknown) => integer(value, 0, CLUES_PER_ROUND - 1);
const roundIndex = (value: unknown) => integer(value, 0, ROUNDS_PER_MATCH - 1);

function player(value: unknown): PlayerSeat {
  const item = object(value);
  return {
    uid: identifier(item.uid), displayName: text(item.displayName), avatarId: text(item.avatarId),
    seat: integer(item.seat, 0, 1) as 0 | 1,
    isHost: boolean(item.isHost), ready: boolean(item.ready),
  };
}
function scenario(value: unknown): Scenario {
  const item = object(value);
  const categories = ['travel', 'food', 'shopping', 'leisure', 'friends', 'daily'];
  if (!categories.includes(text(item.category))) return invalid();
  const options = list(item.options, value => {
    const option = object(value);
    return { id: identifier(option.id), label: text(option.label) };
  });
  if (options.length < 2 || new Set(options.map(option => option.id)).size !== options.length) return invalid();
  return {
    id: identifier(item.id), version: integer(item.version, 1),
    category: item.category as Scenario['category'], prompt: text(item.prompt), options,
  };
}
function scenarios(value: unknown): Scenario[] {
  const result = list(value, scenario);
  return result.length === CLUES_PER_ROUND ? result : invalid();
}
function decision(value: unknown): DecisionAction {
  const item = object(value);
  if (item.type === 'continue' || item.type === 'ack') return { type: item.type };
  if (item.type === 'guess') return { type: 'guess', roleId: role(item.roleId) };
  return invalid();
}
function distinctRoles(value: unknown): [RoleId, RoleId] {
  const result = pair(value, role);
  return result[0] !== result[1] ? result : invalid();
}
function roundResult(value: unknown): RoundResult {
  const item = object(value);
  return {
    roundIndex: roundIndex(item.roundIndex), roles: distinctRoles(item.roles),
    guesses: pair(item.guesses, v => nullable(v, role)),
    guessClueIndex: pair(item.guessClueIndex, v => nullable(v, clue)),
    scores: pair(item.scores, v => integer(v, 0, 5)), reason: pair(item.reason, text),
    ...(item.evidence != null ? { evidence: evidence(item.evidence) } : {}),
  };
}
function evidence(value: unknown): RevealedEvidence[] {
  const result = list(value, value => {
    const entry = object(value);
    return { clueIndex: clue(entry.clueIndex), scenarioId: identifier(entry.scenarioId),
      scenarioVersion: integer(entry.scenarioVersion, 1), prompt: text(entry.prompt), answers: pair(entry.answers, text) };
  });
  if (result.length > CLUES_PER_ROUND || result.some((entry, index) => entry.clueIndex !== index)) invalid();
  return result;
}
function round(value: unknown): RoundState {
  const item = object(value);
  return {
    roundIndex: roundIndex(item.roundIndex), roles: distinctRoles(item.roles),
    scenarios: scenarios(item.scenarios), roleAcks: pair(item.roleAcks, boolean),
    currentAnswers: pair(item.currentAnswers, v => nullable(v, identifier)),
    revealedAnswers: list(item.revealedAnswers, value => {
      const reveal = object(value);
      return { clueIndex: clue(reveal.clueIndex), answers: pair(reveal.answers, identifier) };
    }),
    revealAcks: pair(item.revealAcks, boolean),
    currentDecisions: pair(item.currentDecisions, v => nullable(v, decision)),
    guesses: pair(item.guesses, v => nullable(v, role)),
    guessClueIndex: pair(item.guessClueIndex, v => nullable(v, clue)),
    roundScores: nullable(item.roundScores, v => pair(v, score => integer(score, 0, 5))),
    nextRoundReady: pair(item.nextRoundReady, boolean),
  };
}
function gameState(value: unknown, code: string): GameState {
  const item = object(value);
  const phases: GamePhase[] = ['LOBBY', 'ROLE_INTRO', 'ANSWERING', 'ANSWER_REVEAL', 'DECIDING', 'ROUND_REVEAL', 'MATCH_RESULT', 'ABANDONED', 'CLOSED'];
  if (!phases.includes(item.phase as GamePhase) || item.roomId !== code) return invalid();
  const state: GameState = {
    roomId: code, matchId: identifier(item.matchId), phase: item.phase as GamePhase,
    seats: pair(item.seats, v => nullable(v, player)),
    roundIndex: roundIndex(item.roundIndex), clueIndex: clue(item.clueIndex),
    matchScores: pair(item.matchScores, v => integer(v, 0, ROUNDS_PER_MATCH * 5)),
    roundHistory: list(item.roundHistory, roundResult),
    currentRound: nullable(item.currentRound, round),
    rematchRequests: pair(item.rematchRequests, boolean),
    termination: nullable(item.termination, value => {
      const ending = object(value);
      return { seat: integer(ending.seat, 0, 1) as 0 | 1, displayName: text(ending.displayName) };
    }),
  };
  state.seats.forEach((seat, index) => { if (seat && seat.seat !== index) invalid(); });
  if (state.phase === 'LOBBY') {
    if (state.currentRound || state.roundHistory.length || state.roundIndex !== 0 || state.clueIndex !== 0) invalid();
  } else if (state.phase === 'ABANDONED' || state.phase === 'CLOSED') {
    const occupied = state.seats.filter(Boolean).length;
    if (occupied !== (state.phase === 'CLOSED' ? 0 : 1)) invalid();
    if (state.phase === 'ABANDONED' && (!state.currentRound || !state.termination)) invalid();
    if (state.currentRound) {
      const completed = state.roundIndex === ROUNDS_PER_MATCH - 1 && state.roundHistory.length === ROUNDS_PER_MATCH;
      if (state.currentRound.roundIndex !== state.roundIndex || (!state.termination && !completed) ||
          state.roundHistory.length !== state.roundIndex + (state.currentRound.roundScores ? 1 : 0)) invalid();
    } else if (state.roundHistory.length || state.roundIndex !== 0 || state.clueIndex !== 0) invalid();
  } else {
    if ((state.phase === 'MATCH_RESULT' ? !state.seats.some(Boolean) : !state.seats[0] || !state.seats[1]) || !state.currentRound || state.currentRound.roundIndex !== state.roundIndex) invalid();
    const revealed = state.phase === 'ROUND_REVEAL' || state.phase === 'MATCH_RESULT';
    if (state.roundHistory.length !== state.roundIndex + (revealed ? 1 : 0)) invalid();
    if (revealed && !state.currentRound.roundScores) invalid();
    if (state.phase === 'MATCH_RESULT' && state.roundIndex !== ROUNDS_PER_MATCH - 1) invalid();
  }
  state.roundHistory.forEach((entry, index) => { if (entry.roundIndex !== index) invalid(); });
  return state;
}

/**
 * Only null means absent. Malformed/unsupported rooms throw instead of being
 * treated as not found. Legacy records are normalized in memory, never migrated
 * or deleted by a read; stored projections are rebuilt from validated state.
 */
export function decodeRoomRecord(value: unknown, expectedCode: string): RoomRecord | null {
  if (value === null) return null;
  const item = object(value);
  if (item.schemaVersion !== undefined && item.schemaVersion !== 0 && item.schemaVersion !== ROOM_SCHEMA_VERSION) invalid();
  if (item.code !== expectedCode) invalid();
  const server = object(item.server);
  const state = gameState(server.gameState, expectedCode);
  const memberEntries: Array<[string, RoomRecord['members'][string]]> = [];
  const rawMembers = item.members == null ? {} : object(item.members);
  for (const [uid, value] of Object.entries(rawMembers)) {
    const member = object(value);
    const seat = integer(member.seat, 0, 1) as 0 | 1;
    const occupant = state.seats[seat];
    if (!occupant || occupant.uid !== uid || member.uid !== uid ||
        occupant.isHost !== member.isHost || occupant.displayName !== member.displayName || occupant.avatarId !== member.avatarId) invalid();
    memberEntries.push([uid, {
      uid, seat, displayName: text(member.displayName), avatarId: text(member.avatarId), isHost: boolean(member.isHost),
    }]);
  }
  if (state.seats.some(seat => seat && !Object.hasOwn(rawMembers, seat.uid))) invalid();
  const members: RoomRecord['members'] = Object.fromEntries(memberEntries);
  const receiptEntries: Array<[string, RoomRecord['server']['receipts'][string]]> = [];
  for (const [id, value] of Object.entries(server.receipts == null ? {} : object(server.receipts))) {
    const receipt = object(value);
    const binding = receipt.fingerprint !== undefined ? {
      uid: identifier(receipt.uid), matchId: identifier(receipt.matchId),
      roundId: nullable(receipt.roundId, identifier), clueIndex: clue(receipt.clueIndex),
      fingerprint: typeof receipt.fingerprint === 'string' && /^[a-f0-9]{64}$/.test(receipt.fingerprint) ? receipt.fingerprint : invalid(),
    } : {};
    receiptEntries.push([id, { timestamp: integer(receipt.timestamp), type: identifier(receipt.type), ...binding }]);
  }
  const receipts = Object.fromEntries(receiptEntries);
  const matchDeck = nullable(server.matchDeck, value => {
    const deck = list(value, scenarios);
    return deck.length === ROUNDS_PER_MATCH ? deck : invalid();
  });
  if (state.currentRound && !matchDeck) invalid();
  const views = buildProjections(expectedCode, state, members);
  const publicData = item.public == null ? {} : object(item.public);
  if (publicData.revision !== undefined) views.public.revision = integer(publicData.revision);
  const privateData = item.private == null ? {} : object(item.private);
  for (const [uid, view] of Object.entries(views.private)) {
    const own = Object.hasOwn(privateData, uid) ? object(privateData[uid]) : {};
    if (own.revision !== undefined) view.revision = integer(own.revision);
  }
  const creation = nullable(server.creation, value => {
    const receipt = object(value);
    return { uid: identifier(receipt.uid), requestId: identifier(receipt.requestId), fingerprint: identifier(receipt.fingerprint) };
  });
  return {
    schemaVersion: ROOM_SCHEMA_VERSION, code: expectedCode, members,
    ...views,
    server: {
      gameState: state, matchDeck, receipts, expiresAt: integer(server.expiresAt, 1),
      ...(server.revision !== undefined ? { revision: integer(server.revision) } : {}),
      ...(creation ? { creation } : {}),
    },
  };
}
