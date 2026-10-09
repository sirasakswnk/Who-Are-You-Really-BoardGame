import { describe, it, expect } from 'vitest';
import {
  calculatePlayerScore,
  calculateRoundScores,
  determineMatchWinner,
} from '../../lib/game/scoring';
import { SCORE_TABLE } from '../../lib/game/types';

describe('Scoring Logic', () => {
  it('awards points according to SCORE_TABLE for correct guesses', () => {
    // Clue 0: 5 points
    const s0 = calculatePlayerScore('comfort', 'comfort', 0);
    expect(s0.points).toBe(SCORE_TABLE[0]);
    expect(s0.points).toBe(5);
    expect(s0.reason).toContain('+5');

    // Clue 1: 4 points
    const s1 = calculatePlayerScore('explorer', 'explorer', 1);
    expect(s1.points).toBe(SCORE_TABLE[1]);
    expect(s1.points).toBe(4);
    expect(s1.reason).toContain('+4');

    // Clue 2: 3 points
    const s2 = calculatePlayerScore('companion', 'companion', 2);
    expect(s2.points).toBe(SCORE_TABLE[2]);
    expect(s2.points).toBe(3);
    expect(s2.reason).toContain('+3');

    // Clue 3: 2 points
    const s3 = calculatePlayerScore('saver', 'saver', 3);
    expect(s3.points).toBe(SCORE_TABLE[3]);
    expect(s3.points).toBe(2);
    expect(s3.reason).toContain('+2');
  });

  it('awards 0 points for incorrect guesses at any clue index', () => {
    for (let clue = 0; clue < 4; clue++) {
      const result = calculatePlayerScore('comfort', 'cautious', clue);
      expect(result.points).toBe(0);
      expect(result.reason).toContain('0 คะแนน');
    }
  });

  it('awards 0 points when player did not make a guess', () => {
    const result = calculatePlayerScore(null, 'saver', null);
    expect(result.points).toBe(0);
    expect(result.reason).toContain('ไม่ได้ส่งคำทาย');
  });

  it('calculates round scores correctly for cross-guesses', () => {
    // P0 role: saver, P1 role: explorer
    // P0 guessed explorer at clue 0 (+5)
    // P1 guessed saver at clue 2 (+3)
    const result = calculateRoundScores(
      ['explorer', 'saver'],
      ['saver', 'explorer'],
      [0, 2]
    );

    expect(result.scores).toEqual([5, 3]);
    expect(result.reasons[0]).toContain('+5');
    expect(result.reasons[1]).toContain('+3');
  });

  it('handles asymmetric outcomes (one correct, one incorrect)', () => {
    // P0 role: saver, P1 role: explorer
    // P0 guessed companion (wrong -> 0)
    // P1 guessed saver at clue 1 (+4)
    const result = calculateRoundScores(
      ['companion', 'saver'],
      ['saver', 'explorer'],
      [1, 1]
    );

    expect(result.scores).toEqual([0, 4]);
  });

  describe('determineMatchWinner', () => {
    it('detects seat 0 as winner', () => {
      const outcome = determineMatchWinner([12, 8]);
      expect(outcome.winner).toBe(0);
      expect(outcome.isTie).toBe(false);
      expect(outcome.scoreDifference).toBe(4);
    });

    it('detects seat 1 as winner', () => {
      const outcome = determineMatchWinner([5, 9]);
      expect(outcome.winner).toBe(1);
      expect(outcome.isTie).toBe(false);
      expect(outcome.scoreDifference).toBe(4);
    });

    it('detects a tie when scores are equal', () => {
      const outcome = determineMatchWinner([7, 7]);
      expect(outcome.winner).toBeNull();
      expect(outcome.isTie).toBe(true);
      expect(outcome.scoreDifference).toBe(0);
    });
  });
});
