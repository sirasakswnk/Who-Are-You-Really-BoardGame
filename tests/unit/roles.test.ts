import { describe, it, expect } from 'vitest';
import {
  getAllRolePairs,
  generateRolePair,
  createMulberry32,
  canGuessRole,
  isValidRoleId,
  ALL_ROLE_PAIRS,
} from '../../lib/game/roles';
import { ROLE_IDS } from '../../lib/game/types';

describe('Roles & Role Pairing', () => {
  it('should have exactly 6 distinct roles defined', () => {
    expect(ROLE_IDS).toHaveLength(6);
    const unique = new Set(ROLE_IDS);
    expect(unique.size).toBe(6);
  });

  it('should generate all 30 unique ordered pairs where P0 != P1', () => {
    const pairs = getAllRolePairs();
    expect(pairs).toHaveLength(30);

    const pairStrings = new Set<string>();
    for (const [r0, r1] of pairs) {
      expect(r0).not.toBe(r1);
      pairStrings.add(`${r0}:${r1}`);
    }
    expect(pairStrings.size).toBe(30);
  });

  it('ALL_ROLE_PAIRS constant matches precomputed list', () => {
    expect(ALL_ROLE_PAIRS).toHaveLength(30);
  });

  it('generateRolePair always produces two distinct roles', () => {
    for (let i = 0; i < 100; i++) {
      const [r0, r1] = generateRolePair();
      expect(r0).not.toBe(r1);
      expect(ROLE_IDS).toContain(r0);
      expect(ROLE_IDS).toContain(r1);
    }
  });

  it('seeded Mulberry32 PRNG produces deterministic sequences', () => {
    const rng1 = createMulberry32(12345);
    const rng2 = createMulberry32(12345);

    const sequence1 = Array.from({ length: 10 }, () => rng1());
    const sequence2 = Array.from({ length: 10 }, () => rng2());

    expect(sequence1).toEqual(sequence2);

    const pair1 = generateRolePair(createMulberry32(42));
    const pair2 = generateRolePair(createMulberry32(42));
    expect(pair1).toEqual(pair2);
  });

  it('validates role IDs correctly', () => {
    expect(isValidRoleId('alien')).toBe(true);
    expect(isValidRoleId('spy')).toBe(true);
    expect(isValidRoleId('vampire')).toBe(true);
    expect(isValidRoleId('time_traveler')).toBe(true);
    expect(isValidRoleId('thief')).toBe(true);
    expect(isValidRoleId('ghost')).toBe(true);
    expect(isValidRoleId('traitor')).toBe(false);
    expect(isValidRoleId(null)).toBe(false);
    expect(isValidRoleId(123)).toBe(false);
  });

  it('canGuessRole disallows guessing own role', () => {
    expect(canGuessRole('spy', 'alien')).toBe(true);
    expect(canGuessRole('alien', 'alien')).toBe(false);
    expect(canGuessRole('ghost', 'ghost')).toBe(false);
  });
});
