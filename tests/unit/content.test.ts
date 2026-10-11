import { describe, expect, it } from 'vitest';
import { SCENARIOS, ROUND_PACKS, stripEditorial, getScenarioById } from '../../content/scenarios';
import { validateCatalog } from '../../content/validator';
import { selectMatchDeck } from '../../lib/server/deck';
import { createMulberry32 } from '../../lib/game/roles';

describe('Hidden identities catalog integrity (not balance)', () => {
  it('has 16 unique scenarios, 64 stable options, four complete packs and no inferred answers', () => {
    expect(validateCatalog(SCENARIOS)).toMatchObject({ isValid: true, totalScenarios: 16, balanceStatus: 'unassessed', issues: [] });
    expect(ROUND_PACKS.map(pack => pack.id)).toEqual(['A', 'B', 'C', 'D']);
    expect(SCENARIOS.every(s => s.version === 1 && !s.editorial)).toBe(true);
    expect(getScenarioById('travel-rain')).toBeUndefined();
    expect(getScenarioById('hi-q01')).toBe(SCENARIOS[0]);
  });
  it('rejects insufficient pools, broken pack references, duplicates and blank labels', () => {
    expect(validateCatalog(SCENARIOS.slice(1)).isValid).toBe(false);
    expect(validateCatalog(SCENARIOS, [...ROUND_PACKS.slice(1), ROUND_PACKS[1]]).isValid).toBe(false);
    const broken = structuredClone(SCENARIOS);
    broken[0].options[1].id = broken[0].options[0].id;
    broken[1].options[0].label = ' ';
    expect(validateCatalog(broken).isValid).toBe(false);
    expect(validateCatalog(SCENARIOS, ROUND_PACKS.map(p => ({ ...p, scenarioIds: ['missing', ...p.scenarioIds.slice(1)] }))).isValid).toBe(false);
  });
  it('shuffles packs once, preserves clue order and never repeats questions across 100 seeds', () => {
    const permutations = new Set<string>();
    for (let seed = 0; seed < 100; seed++) {
      const deck = selectMatchDeck(createMulberry32(seed));
      expect(deck).toHaveLength(4);
      expect(new Set(deck.flat().map(s => s.id)).size).toBe(16);
      for (const round of deck) {
        expect(ROUND_PACKS.some(p => JSON.stringify(p.scenarioIds) === JSON.stringify(round.map(s => s.id)))).toBe(true);
        for (const scenario of round) {
          expect(new Set(scenario.options.map(o => o.id))).toEqual(new Set(getScenarioById(scenario.id)!.options.map(o => o.id)));
          expect(scenario).not.toHaveProperty('editorial');
        }
      }
      permutations.add(deck.map(round => round[0].id).join(','));
    }
    expect(permutations.size).toBeGreaterThan(1);
    expect(selectMatchDeck(createMulberry32(42))).toEqual(selectMatchDeck(createMulberry32(42)));
  });
  it('copies only client fields even when injected metadata exists', () => {
    const source = { ...SCENARIOS[0], editorial: { secret: 'inference' }, correctAnswer: 'hidden' };
    const clean = stripEditorial(source);
    expect(Object.keys(clean).sort()).toEqual(['category', 'id', 'options', 'prompt', 'version']);
    clean.options[0].label = 'changed';
    expect(SCENARIOS[0].options[0].label).not.toBe('changed');
  });
});
