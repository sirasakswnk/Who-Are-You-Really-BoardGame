/**
 * Role generation and catalog utilities
 * Implements role pairing, validation, and deterministic random generators
 */

import { RoleId, ROLE_IDS, getRoleIds, roleContentVersion, ACTIVE_CONTENT_VERSION, type ContentVersion } from './types';

/**
 * Returns all 30 possible ordered role pairs (P0 != P1).
 * 6 roles * 5 remaining = 30 ordered pairs.
 */
export function getAllRolePairs(version: ContentVersion = ACTIVE_CONTENT_VERSION): Array<[RoleId, RoleId]> {
  const pairs: Array<[RoleId, RoleId]> = [];
  for (const r0 of getRoleIds(version)) {
    for (const r1 of getRoleIds(version)) {
      if (r0 !== r1) {
        pairs.push([r0, r1]);
      }
    }
  }
  return pairs;
}

/** Precomputed 30 ordered pairs */
export const ALL_ROLE_PAIRS = getAllRolePairs();

/**
 * Creates a deterministic 32-bit PRNG (Mulberry32).
 * Ideal for seeded testing and deterministic game replays.
 */
export function createMulberry32(seed: number): () => number {
  let a = seed | 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Randomly generates a role pair [seat0Role, seat1Role] where seat0Role != seat1Role.
 * Accepts an optional custom random number generator (0 <= rng() < 1).
 */
export function generateRolePair(rng: () => number = Math.random, version: ContentVersion = ACTIVE_CONTENT_VERSION): [RoleId, RoleId] {
  const pairs = version === ACTIVE_CONTENT_VERSION ? ALL_ROLE_PAIRS : getAllRolePairs(version);
  const pair = pairs[Math.floor(rng() * pairs.length)];
  return [pair[0], pair[1]];
}

/**
 * Validates if a string is a valid RoleId.
 */
export function isValidRoleId(val: unknown): val is RoleId {
  return typeof val === 'string' && ROLE_IDS.some(role => role === val);
}

/**
 * Checks if a player can guess a role.
 * Rule: Players cannot guess their own assigned role!
 */
export function canGuessRole(guessedRole: RoleId, ownRole: RoleId): boolean {
  return getRoleIds(roleContentVersion(ownRole)).includes(guessedRole) && guessedRole !== ownRole;
}
