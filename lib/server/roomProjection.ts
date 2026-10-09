import type { GameState } from '../game/types';
import { getPlayerProjection } from '../game/engine';
import type { RoomRecord } from './roomRecord';
import { revealedEvidence } from '../game/evidence';

/**
 * Explicit allowlists keep server-only fields out of persisted client views.
 * No internal revision or timestamp may be copied here: private decisions must
 * not change the opponent's public view before a public phase transition.
 */
export function buildProjections(
  code: string,
  state: GameState,
  members: RoomRecord['members']
): Pick<RoomRecord, 'public' | 'private'> {
  const round = state.currentRound;
  // Compatibility context only; unique match/round lifecycle is handled in F03.
  const roundId = round ? `${state.matchId}:round:${state.roundIndex}` : null;
  const history = state.roundHistory.map(result => ({
    roundIndex: result.roundIndex, roles: result.roles, guesses: result.guesses,
    guessClueIndex: result.guessClueIndex, scores: result.scores, reason: result.reason,
    evidence: (result.evidence ?? (round?.roundScores && round.roundIndex === result.roundIndex ? revealedEvidence(round) : [])).map(entry => ({
      clueIndex: entry.clueIndex, scenarioId: entry.scenarioId, scenarioVersion: entry.scenarioVersion,
      prompt: entry.prompt, answers: [entry.answers[0], entry.answers[1]] as [string, string],
    })),
  }));
  const publicProjection: RoomRecord['public'] = {
    code,
    phase: state.phase,
    matchId: state.matchId,
    roundId,
    roundIndex: state.roundIndex,
    clueIndex: state.clueIndex,
    matchScores: state.matchScores,
    players: state.seats,
    scenario: round?.scenarios[state.clueIndex] ?? null,
    revealedAnswers: round?.revealedAnswers ?? [],
    revealedEvidence: round ? revealedEvidence(round) : [],
    roundHistory: history,
    roundSummary:
      state.phase === 'ROUND_REVEAL' || state.phase === 'MATCH_RESULT'
        ? history[history.length - 1] ?? null
        : null,
    rematchRequests: state.rematchRequests,
    termination: state.termination ?? null,
  };

  const privateEntries: Array<[string, RoomRecord['private'][string]]> = [];
  for (const [uid, member] of Object.entries(members)) {
    const seat = member.seat;
    const own = getPlayerProjection(state, seat);
    privateEntries.push([uid, {
      matchId: state.matchId,
      roundId,
      phase: state.phase,
      clueIndex: state.clueIndex,
      role: own.myRole,
      guess: own.myGuessedRole,
      guessClueIndex: own.myGuessedClueIndex,
      committedAnswer: own.myCommittedAnswer,
      hasGuessed: own.hasGuessed,
      roleAcknowledged: round?.roleAcks[seat] ?? false,
      answerSubmitted: round ? round.currentAnswers[seat] !== null : false,
      revealAcknowledged: round?.revealAcks[seat] ?? false,
      decisionSubmitted: round ? round.currentDecisions[seat] !== null : false,
      nextRoundReady: round?.nextRoundReady[seat] ?? false,
      rematchRequested: state.rematchRequests[seat],
    }]);
  }
  return { public: publicProjection, private: Object.fromEntries(privateEntries) };
}
