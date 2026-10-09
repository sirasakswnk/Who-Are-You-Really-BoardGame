/**
 * Scoring logic for Who Are You Really?
 * Implements score calculation, score-once semantics, explanations, and match outcome
 */

import { RoleId, SCORE_TABLE } from './types';

/**
 * Calculates score earned by a player for a single round.
 * 
 * Rules:
 * - Guessed correctly after clue 0: 5 points
 * - Guessed correctly after clue 1: 4 points
 * - Guessed correctly after clue 2: 3 points
 * - Guessed correctly after clue 3: 2 points
 * - Incorrect guess: 0 points
 * - No guess: 0 points
 */
export function calculatePlayerScore(
  guessedRole: RoleId | null,
  actualOpponentRole: RoleId,
  guessClueIndex: number | null
): { points: number; reason: string } {
  if (guessedRole === null || guessClueIndex === null) {
    return {
      points: 0,
      reason: 'ไม่ได้ส่งคำทาย (0 คะแนน)',
    };
  }

  if (guessedRole === actualOpponentRole) {
    const points = SCORE_TABLE[guessClueIndex] ?? 0;
    const clueNumber = guessClueIndex + 1;
    return {
      points,
      reason: `ทายถูกต้องหลังข้อที่ ${clueNumber} (+${points} คะแนน)`,
    };
  }

  return {
    points: 0,
    reason: 'ทายไม่ถูกต้อง (0 คะแนน)',
  };
}

/**
 * Calculates round scores for both players.
 *
 * @param guesses [seat0Guess, seat1Guess]
 * @param actualRoles [seat0Role, seat1Role]
 * @param clueIndices [seat0ClueIndex, seat1ClueIndex]
 */
export function calculateRoundScores(
  guesses: [RoleId | null, RoleId | null],
  actualRoles: [RoleId, RoleId],
  clueIndices: [number | null, number | null]
): {
  scores: [number, number];
  reasons: [string, string];
} {
  // seat 0 tries to guess seat 1's role
  const p0Result = calculatePlayerScore(guesses[0], actualRoles[1], clueIndices[0]);
  // seat 1 tries to guess seat 0's role
  const p1Result = calculatePlayerScore(guesses[1], actualRoles[0], clueIndices[1]);

  return {
    scores: [p0Result.points, p1Result.points],
    reasons: [p0Result.reason, p1Result.reason],
  };
}

/**
 * Result of the match after 4 rounds
 */
export interface MatchOutcome {
  winner: 0 | 1 | null; // null if tie
  isTie: boolean;
  scoreDifference: number;
}

/**
 * Determines the winner from cumulative match scores.
 */
export function determineMatchWinner(scores: [number, number]): MatchOutcome {
  const [s0, s1] = scores;
  if (s0 > s1) {
    return { winner: 0, isTie: false, scoreDifference: s0 - s1 };
  } else if (s1 > s0) {
    return { winner: 1, isTie: false, scoreDifference: s1 - s0 };
  } else {
    return { winner: null, isTie: true, scoreDifference: 0 };
  }
}
