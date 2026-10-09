/**
 * Match Deck Generator
 * Selects 16 scenarios per match across 4 rounds without replacement,
 * independent of role assignments, shuffles options once per scenario,
 * and strips server-only editorial metadata.
 */

import { Scenario, ROUNDS_PER_MATCH, CLUES_PER_ROUND } from '../game/types';
import { SCENARIOS, stripEditorial } from '../../content/scenarios';

/**
 * Fisher-Yates array shuffle using provided RNG (0 <= rng() < 1).
 */
export function shuffleArray<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

/**
 * Selects 16 scenarios for a 4-round match without replacement.
 * 
 * Guarantees:
 * 1. Exactly 16 unique scenarios per match (no duplicates within a match).
 * 2. Partitioned into 4 rounds of 4 clues each.
 * 3. Independent of assigned roles (never leaks secret roles).
 * 4. High category variety across rounds.
 * 5. Options within each scenario are shuffled once on the server (preserving stable IDs).
 * 6. Editorial metadata is stripped from all scenarios before returning.
 */
export function selectMatchDeck(
  rng: () => number = Math.random
): Scenario[][] {
  const TOTAL_NEEDED = ROUNDS_PER_MATCH * CLUES_PER_ROUND; // 16

  // Group scenarios by category
  const byCategory: Record<string, typeof SCENARIOS> = {};
  for (const s of SCENARIOS) {
    if (!byCategory[s.category]) {
      byCategory[s.category] = [];
    }
    byCategory[s.category].push(s);
  }

  // Shuffle scenarios within each category
  const shuffledCategories: string[] = shuffleArray(Object.keys(byCategory), rng);
  const shuffledPoolByCategory: Record<string, typeof SCENARIOS> = {};
  for (const cat of shuffledCategories) {
    shuffledPoolByCategory[cat] = shuffleArray(byCategory[cat], rng);
  }

  // Interleave scenarios across categories to maximize diversity
  const interleaved: typeof SCENARIOS = [];
  let added = true;
  while (added && interleaved.length < TOTAL_NEEDED) {
    added = false;
    for (const cat of shuffledCategories) {
      if (shuffledPoolByCategory[cat].length > 0 && interleaved.length < TOTAL_NEEDED) {
        interleaved.push(shuffledPoolByCategory[cat].pop()!);
        added = true;
      }
    }
  }

  // If interleaved isn't 16 (fallback), fill from remaining shuffled pool
  if (interleaved.length < TOTAL_NEEDED) {
    const remaining = shuffleArray(
      SCENARIOS.filter((s) => !interleaved.some((i) => i.id === s.id)),
      rng
    );
    interleaved.push(...remaining.slice(0, TOTAL_NEEDED - interleaved.length));
  }

  // Partition into 4 rounds of 4 scenarios each
  const rounds: Scenario[][] = [];
  for (let r = 0; r < ROUNDS_PER_MATCH; r++) {
    const roundScenarios: Scenario[] = [];
    for (let c = 0; c < CLUES_PER_ROUND; c++) {
      const original = interleaved[r * CLUES_PER_ROUND + c];
      const stripped = stripEditorial(original);

      // Shuffle options once on server (stable option IDs preserved)
      const shuffledOptions = shuffleArray(stripped.options, rng);
      roundScenarios.push({
        ...stripped,
        options: shuffledOptions,
      });
    }
    rounds.push(roundScenarios);
  }

  return rounds;
}
