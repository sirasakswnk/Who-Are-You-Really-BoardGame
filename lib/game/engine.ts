/**
 * Game Engine Reducer and Projections
 * Pure state machine handling game rounds, clues, decision barriers, and player projections
 */

import {
  GameState,
  GameAction,
  RoundState,
  Scenario,
  PlayerProjection,
  EngineResult,
  ROUNDS_PER_MATCH,
  CLUES_PER_ROUND,
  RoleId,
  DecisionAction, ACTIVE_CONTENT_VERSION, stateContentVersion, getRoleIds,
} from './types';
import { generateRolePair, canGuessRole } from './roles';
import { calculateRoundScores } from './scoring';
import { revealedEvidence } from './evidence';

/**
 * Creates default fallback scenarios for testing and bootstrapping.
 */
export function createDefaultRoundScenarios(roundIndex: number): Scenario[] {
  const categories: Scenario['category'][] = ['travel', 'food', 'shopping', 'leisure'];
  return Array.from({ length: CLUES_PER_ROUND }, (_, i) => ({
    id: `round-${roundIndex}-clue-${i}`,
    version: 1,
    category: categories[i % categories.length],
    prompt: `สถานการณ์ที่ ${i + 1} ประจำรอบที่ ${roundIndex + 1}`,
    options: [
      { id: `opt-a`, label: `ทางเลือก A สำหรับสถานการณ์ที่ ${i + 1}` },
      { id: `opt-b`, label: `ทางเลือก B สำหรับสถานการณ์ที่ ${i + 1}` },
      { id: `opt-c`, label: `ทางเลือก C สำหรับสถานการณ์ที่ ${i + 1}` },
      { id: `opt-d`, label: `ทางเลือก D สำหรับสถานการณ์ที่ ${i + 1}` },
    ],
  }));
}

/**
 * Creates initial empty game state for a new room.
 */
export function createInitialGameState(roomId: string, matchId = `m-${Date.now()}`): GameState {
  return {
    roomId,
    matchId,
    phase: 'LOBBY',
    contentVersion: ACTIVE_CONTENT_VERSION,
    seats: [null, null],
    roundIndex: 0,
    clueIndex: 0,
    matchScores: [0, 0],
    roundHistory: [],
    currentRound: null,
    rematchRequests: [false, false],
    termination: null,
  };
}

/**
 * Pure Game Engine Reducer
 */
export function processAction(state: GameState, action: GameAction): EngineResult {
  if ('seat' in action && (action.seat !== 0 && action.seat !== 1)) {
    return { success: false, state, error: 'Invalid seat index' };
  }
  switch (action.type) {
    case 'PLAYER_JOIN': {
      if (state.phase !== 'LOBBY') {
        return { success: false, state, error: 'Cannot join room after match has started' };
      }
      const { seat, uid, displayName, avatarId, isHost } = action;
      if (seat !== 0 && seat !== 1) {
        return { success: false, state, error: 'Invalid seat index' };
      }
      if (state.seats[seat] !== null) {
        return { success: false, state, error: `Seat ${seat} is already occupied` };
      }

      const newSeats: GameState['seats'] = [...state.seats];
      newSeats[seat] = {
        uid,
        displayName,
        avatarId,
        seat,
        isHost: isHost ?? (seat === 0),
        ready: false,
      };

      return {
        success: true,
        state: { ...state, seats: newSeats },
      };
    }

    case 'PLAYER_LEAVE': {
      const { seat } = action;
      const leaving = state.seats[seat];
      if (!leaving) return { success: false, state, error: 'Seat is not occupied' };
      const newSeats: GameState['seats'] = [...state.seats];
      newSeats[seat] = null;
      const remaining = newSeats.findIndex(player => player !== null);
      if (state.phase === 'LOBBY' && remaining >= 0) {
        newSeats[remaining] = { ...newSeats[remaining]!, isHost: true, ready: false };
      }
      return {
        success: true,
        state: {
          ...state, seats: newSeats,
          phase: remaining < 0 ? 'CLOSED' : state.phase === 'LOBBY' || state.phase === 'MATCH_RESULT' ? state.phase : 'ABANDONED',
          rematchRequests: [false, false],
          termination: state.phase === 'LOBBY' || state.phase === 'MATCH_RESULT' ? null : state.termination ?? { seat, displayName: leaving.displayName },
        },
      };
    }

    case 'PLAYER_READY': {
      if (state.phase !== 'LOBBY') {
        return { success: false, state, error: 'Ready status can only be toggled in LOBBY' };
      }
      const { seat, ready } = action;
      if (!state.seats[seat]) {
        return { success: false, state, error: `Seat ${seat} is not occupied` };
      }
      const newSeats: GameState['seats'] = [
        state.seats[0] ? { ...state.seats[0] } : null,
        state.seats[1] ? { ...state.seats[1] } : null,
      ];
      if (newSeats[seat]) {
        newSeats[seat]!.ready = ready;
      }
      return {
        success: true,
        state: { ...state, seats: newSeats },
      };
    }

    case 'START_MATCH': {
      if (state.phase !== 'LOBBY') {
        return { success: false, state, error: 'Can only start match from LOBBY phase' };
      }
      if (!state.seats[0] || !state.seats[1]) {
        return { success: false, state, error: 'Both seats must be occupied to start' };
      }
      if (!state.seats[0].ready || !state.seats[1].ready) {
        return { success: false, state, error: 'Both players must be ready to start' };
      }

      const rolePair = action.rolePair ?? generateRolePair();
      if (rolePair[0] === rolePair[1] || rolePair.some(role => !getRoleIds().includes(role))) {
        return { success: false, state, error: 'Invalid role pair for content version' };
      }
      const scenarios = action.scenarios ?? createDefaultRoundScenarios(0);

      const roundState: RoundState = {
        roundIndex: 0,
        roles: rolePair,
        scenarios,
        roleAcks: [false, false],
        currentAnswers: [null, null],
        revealedAnswers: [],
        revealAcks: [false, false],
        currentDecisions: [null, null],
        guesses: [null, null],
        guessClueIndex: [null, null],
        roundScores: null,
        nextRoundReady: [false, false],
      };

      return {
        success: true,
        state: {
          ...state,
          matchId: action.matchId ?? state.matchId,
          contentVersion: ACTIVE_CONTENT_VERSION,
          phase: 'ROLE_INTRO',
          roundIndex: 0,
          clueIndex: 0,
          matchScores: [0, 0],
          roundHistory: [],
          currentRound: roundState,
          rematchRequests: [false, false],
        },
      };
    }

    case 'ROLE_ACK': {
      if (state.phase !== 'ROLE_INTRO' || !state.currentRound) {
        return { success: false, state, error: 'Not in ROLE_INTRO phase' };
      }
      const { seat } = action;
      const roleAcks: [boolean, boolean] = [...state.currentRound.roleAcks];
      roleAcks[seat] = true;

      const updatedRound: RoundState = {
        ...state.currentRound,
        roleAcks,
      };

      // If both acknowledged their roles, proceed to ANSWERING clue 0
      const bothAcked = roleAcks[0] && roleAcks[1];
      return {
        success: true,
        state: {
          ...state,
          phase: bothAcked ? 'ANSWERING' : 'ROLE_INTRO',
          currentRound: updatedRound,
          clueIndex: 0,
        },
      };
    }

    case 'SUBMIT_ANSWER': {
      if (state.phase !== 'ANSWERING' || !state.currentRound) {
        return { success: false, state, error: 'Not in ANSWERING phase' };
      }
      const { seat, clueIndex, optionId } = action;
      if (clueIndex !== state.clueIndex) {
        return { success: false, state, error: `Stale clue index: expected ${state.clueIndex}, got ${clueIndex}` };
      }
      if (state.currentRound.currentAnswers[seat] !== null) {
        return { success: false, state, error: 'Answer already submitted and locked for this clue' };
      }
      if (!state.currentRound.scenarios[clueIndex]?.options.some(option => option.id === optionId)) {
        return { success: false, state, error: 'Invalid option for this scenario' };
      }

      const answers: [string | null, string | null] = [...state.currentRound.currentAnswers];
      answers[seat] = optionId;

      const updatedRound: RoundState = {
        ...state.currentRound,
        currentAnswers: answers,
      };

      // If both answered, advance to ANSWER_REVEAL and log revealed answers
      const bothAnswered = answers[0] !== null && answers[1] !== null;
      if (bothAnswered) {
        const revealed = [
          ...updatedRound.revealedAnswers,
          { clueIndex, answers: [answers[0]!, answers[1]!] as [string, string] },
        ];
        return {
          success: true,
          state: {
            ...state,
            phase: 'ANSWER_REVEAL',
            currentRound: {
              ...updatedRound,
              revealedAnswers: revealed,
              revealAcks: [false, false],
            },
          },
        };
      }

      return {
        success: true,
        state: {
          ...state,
          currentRound: updatedRound,
        },
      };
    }

    case 'REVEAL_ACK': {
      if (state.phase !== 'ANSWER_REVEAL' || !state.currentRound) {
        return { success: false, state, error: 'Not in ANSWER_REVEAL phase' };
      }
      const { seat, clueIndex } = action;
      if (clueIndex !== state.clueIndex) {
        return { success: false, state, error: `Stale clue index in reveal ack` };
      }

      const acks: [boolean, boolean] = [...state.currentRound.revealAcks];
      acks[seat] = true;

      const bothAcked = acks[0] && acks[1];
      return {
        success: true,
        state: {
          ...state,
          phase: bothAcked ? 'DECIDING' : 'ANSWER_REVEAL',
          currentRound: {
            ...state.currentRound,
            revealAcks: acks,
            currentDecisions: bothAcked ? [null, null] : state.currentRound.currentDecisions,
          },
        },
      };
    }

    case 'SUBMIT_DECISION': {
      if (state.phase !== 'DECIDING' || !state.currentRound) {
        return { success: false, state, error: 'Not in DECIDING phase' };
      }
      const { seat, clueIndex, decision } = action;
      if (!decision || !['continue', 'guess', 'ack'].includes(decision.type)) {
        return { success: false, state, error: 'Invalid decision type' };
      }
      if (clueIndex !== state.clueIndex) {
        return { success: false, state, error: `Stale clue index in decision: expected ${state.clueIndex}` };
      }
      if (state.currentRound.currentDecisions[seat] !== null) {
        return { success: false, state, error: 'Decision already submitted for this clue' };
      }

      const alreadyGuessed = state.currentRound.guesses[seat] !== null;
      const ownRole = state.currentRound.roles[seat];

      // Validate decision based on player status
      if (alreadyGuessed) {
        // Player already locked their guess in a previous clue: must send 'ack'
        if (decision.type !== 'ack') {
          return { success: false, state, error: 'Player already guessed; must submit ack' };
        }
      } else {
        // Player has NOT guessed yet
        if (decision.type === 'ack') {
          return { success: false, state, error: 'Player has not guessed yet; must choose continue or guess' };
        }

        // At final clue (clueIndex 3), player cannot choose continue
        if (clueIndex === CLUES_PER_ROUND - 1 && decision.type === 'continue') {
          return { success: false, state, error: 'Cannot continue at final clue; must make a guess' };
        }

        if (decision.type === 'guess') {
          if (!canGuessRole(decision.roleId, ownRole)) {
            return { success: false, state, error: 'Cannot guess your own role or invalid role' };
          }
        }
      }

      // Record decision
      const decisions: [DecisionAction | null, DecisionAction | null] = [...state.currentRound.currentDecisions];
      decisions[seat] = decision;

      // Update cumulative guess if it's a guess
      const guesses: [RoleId | null, RoleId | null] = [...state.currentRound.guesses];
      const guessClueIndices: [number | null, number | null] = [...state.currentRound.guessClueIndex];

      if (!alreadyGuessed && decision.type === 'guess') {
        guesses[seat] = decision.roleId;
        guessClueIndices[seat] = clueIndex;
      }

      let updatedRound: RoundState = {
        ...state.currentRound,
        currentDecisions: decisions,
        guesses,
        guessClueIndex: guessClueIndices,
      };

      // Check if both players have submitted decisions for this clue
      const bothSubmitted = decisions[0] !== null && decisions[1] !== null;
      if (!bothSubmitted) {
        return {
          success: true,
          state: { ...state, currentRound: updatedRound },
        };
      }

      // Both submitted! Check round termination condition:
      // Condition 1: Both players have guessed (either earlier or just now)
      // Condition 2: This is the final clue (clueIndex === 3)
      const bothHaveGuessed = guesses[0] !== null && guesses[1] !== null;
      const isFinalClue = clueIndex === CLUES_PER_ROUND - 1;

      if (bothHaveGuessed || isFinalClue) {
        // End of round! Calculate scores with score-once semantics
        const roundCalc = calculateRoundScores(guesses, updatedRound.roles, guessClueIndices);
        const newMatchScores: [number, number] = [
          state.matchScores[0] + roundCalc.scores[0],
          state.matchScores[1] + roundCalc.scores[1],
        ];

        const historyEntry = {
          roundIndex: state.roundIndex,
          roles: updatedRound.roles,
          guesses: updatedRound.guesses,
          guessClueIndex: updatedRound.guessClueIndex,
          scores: roundCalc.scores,
          reason: roundCalc.reasons,
          evidence: revealedEvidence(updatedRound),
        };

        updatedRound = {
          ...updatedRound,
          roundScores: roundCalc.scores,
          nextRoundReady: [false, false],
        };

        return {
          success: true,
          state: {
            ...state,
            phase: 'ROUND_REVEAL',
            matchScores: newMatchScores,
            roundHistory: [...state.roundHistory, historyEntry],
            currentRound: updatedRound,
          },
        };
      }

      // Otherwise, advance to next clue in this round
      const nextClueIndex = clueIndex + 1;
      return {
        success: true,
        state: {
          ...state,
          phase: 'ANSWERING',
          clueIndex: nextClueIndex,
          currentRound: {
            ...updatedRound,
            currentAnswers: [null, null],
            revealAcks: [false, false],
            currentDecisions: [null, null],
          },
        },
      };
    }

    case 'NEXT_ROUND_READY': {
      if (state.phase !== 'ROUND_REVEAL' || !state.currentRound) {
        return { success: false, state, error: 'Not in ROUND_REVEAL phase' };
      }
      const { seat, nextRolePair, nextScenarios } = action;
      const nextReady: [boolean, boolean] = [...state.currentRound.nextRoundReady];
      nextReady[seat] = true;

      const updatedRound: RoundState = {
        ...state.currentRound,
        nextRoundReady: nextReady,
      };

      const bothReady = nextReady[0] && nextReady[1];
      if (!bothReady) {
        return {
          success: true,
          state: { ...state, currentRound: updatedRound },
        };
      }

      // Both ready! Check if match has finished all 4 rounds
      const isFinalRound = state.roundIndex === ROUNDS_PER_MATCH - 1;
      if (isFinalRound) {
        return {
          success: true,
          state: {
            ...state,
            phase: 'MATCH_RESULT',
            rematchRequests: [false, false],
            termination: null,
          },
        };
      }

      // Advance to next round
      const nextRoundIndex = state.roundIndex + 1;
      const version = stateContentVersion(state);
      const rolePair = nextRolePair ?? generateRolePair(Math.random, version);
      if (rolePair[0] === rolePair[1] || rolePair.some(role => !getRoleIds(version).includes(role))) {
        return { success: false, state, error: 'Invalid role pair for content version' };
      }
      const scenarios = nextScenarios ?? createDefaultRoundScenarios(nextRoundIndex);

      const nextRoundState: RoundState = {
        roundIndex: nextRoundIndex,
        roles: rolePair,
        scenarios,
        roleAcks: [false, false],
        currentAnswers: [null, null],
        revealedAnswers: [],
        revealAcks: [false, false],
        currentDecisions: [null, null],
        guesses: [null, null],
        guessClueIndex: [null, null],
        roundScores: null,
        nextRoundReady: [false, false],
      };

      return {
        success: true,
        state: {
          ...state,
          phase: 'ROLE_INTRO',
          roundIndex: nextRoundIndex,
          clueIndex: 0,
          currentRound: nextRoundState,
        },
      };
    }

    case 'REMATCH_REQUEST': {
      if (!state.seats[0] || !state.seats[1]) return { success: false, state, error: 'คู่เล่นออกจากห้องแล้ว กรุณาสร้างห้องใหม่' };
      if (state.phase !== 'MATCH_RESULT') {
        return { success: false, state, error: 'Rematch can only be requested in MATCH_RESULT phase' };
      }
      const { seat } = action;
      const rematches: [boolean, boolean] = [...state.rematchRequests];
      rematches[seat] = true;

      const bothRequested = rematches[0] && rematches[1];
      if (bothRequested) {
        if (!action.nextMatchId || action.nextMatchId === state.matchId) {
          return { success: false, state, error: 'Rematch requires a new match identity' };
        }
        // Reset back to LOBBY
        const resetSeats: GameState['seats'] = [
          state.seats[0] ? { ...state.seats[0], ready: false } : null,
          state.seats[1] ? { ...state.seats[1], ready: false } : null,
        ];
        return {
          success: true,
          state: {
            ...state,
            phase: 'LOBBY',
            matchId: action.nextMatchId,
            contentVersion: ACTIVE_CONTENT_VERSION,
            roundIndex: 0,
            clueIndex: 0,
            matchScores: [0, 0],
            roundHistory: [],
            currentRound: null,
            seats: resetSeats,
            rematchRequests: [false, false],
            termination: null,
          },
        };
      }

      return {
        success: true,
        state: {
          ...state,
          rematchRequests: rematches,
        },
      };
    }

    default:
      return { success: false, state, error: 'Unknown action type' };
  }
}

/**
 * Creates a sanitized player projection.
 * Enforces privacy boundaries:
 * - Opponent's secret role is never exposed before ROUND_REVEAL
 * - Opponent's submitted answer is hidden during ANSWERING (only boolean revealed)
 * - Opponent's decision or guess is completely hidden during DECIDING
 */
export function getPlayerProjection(state: GameState, seat: 0 | 1): PlayerProjection {
  const opponentSeat = seat === 0 ? 1 : 0;
  const round = state.currentRound;

  let currentScenario: Scenario | null = null;
  if (round && round.scenarios[state.clueIndex]) {
    currentScenario = round.scenarios[state.clueIndex];
  }

  const isRevealedPhase = state.phase === 'ROUND_REVEAL' || state.phase === 'MATCH_RESULT';

  const roundSummary = isRevealedPhase && state.roundHistory.length > 0
    ? state.roundHistory[state.roundHistory.length - 1]
    : null;

  return {
    roomId: state.roomId,
    matchId: state.matchId,
    contentVersion: stateContentVersion(state),
    phase: state.phase,
    mySeat: seat,
    players: state.seats,
    roundIndex: state.roundIndex,
    clueIndex: state.clueIndex,
    matchScores: state.matchScores,
    roundHistory: state.roundHistory,

    // Private to this seat
    myRole: round ? round.roles[seat] : null,
    myGuessedRole: round ? round.guesses[seat] : null,
    myGuessedClueIndex: round ? round.guessClueIndex[seat] : null,
    hasGuessed: round ? round.guesses[seat] !== null : false,
    myCommittedAnswer: round ? round.currentAnswers[seat] : null,

    // Round info
    currentScenario,
    opponentHasAnswered: round ? round.currentAnswers[opponentSeat] !== null : false,
    revealedAnswers: round ? round.revealedAnswers : [],

    // Decision info: Never exposes opponent's guess/decision type
    bothDecisionsSubmitted: round
      ? round.currentDecisions[0] !== null && round.currentDecisions[1] !== null
      : false,

    roundSummary,
    rematchRequests: state.rematchRequests,
  };
}
