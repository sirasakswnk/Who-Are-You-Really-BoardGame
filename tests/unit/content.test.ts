import { describe, it, expect } from 'vitest';
import { SCENARIOS, stripEditorial, getScenarioById } from '../../content/scenarios';
import {
  validateCatalog,
  analyzePairwiseCoverage,
  formatCoverageReport,
} from '../../content/validator';
import { selectMatchDeck } from '../../lib/server/deck';
import { createMulberry32 } from '../../lib/game/roles';
import { processAction, createInitialGameState } from '../../lib/game/engine';

describe('Content Catalog (24 Scenarios)', () => {
  it('contains exactly 24 authored scenarios', () => {
    expect(SCENARIOS).toHaveLength(24);
  });

  it('passes all structural and editorial validations without errors', () => {
    const result = validateCatalog(SCENARIOS);
    const errors = result.issues.filter((i) => i.severity === 'error');

    if (errors.length > 0) {
      console.error('Validation errors:', errors);
    }

    expect(errors).toHaveLength(0);
    expect(result.isValid).toBe(true);
  });

  it('has exactly 4 scenarios per category across all 6 categories', () => {
    const result = validateCatalog(SCENARIOS);
    expect(result.categoryCounts).toEqual({
      travel: 4,
      food: 4,
      shopping: 4,
      leisure: 4,
      friends: 4,
      daily: 4,
    });
  });

  it('ensures all options have reasonable, non-empty labels', () => {
    for (const s of SCENARIOS) {
      expect(s.options.length).toBeGreaterThanOrEqual(3);
      expect(s.options.length).toBeLessThanOrEqual(4);
      for (const opt of s.options) {
        expect(opt.label.length).toBeGreaterThan(5);
        expect(opt.id).toMatch(/^opt-/);
      }
    }
  });

  it('can look up scenarios by ID', () => {
    const rain = getScenarioById('travel-rain');
    expect(rain).toBeDefined();
    expect(rain?.category).toBe('travel');

    const nonExistent = getScenarioById('non-existent-id');
    expect(nonExistent).toBeUndefined();
  });
});

describe('15-Pair Distinguishability Coverage', () => {
  it('covers all 15 unordered role pairs with at least 10 distinguishing scenarios each', () => {
    const report = analyzePairwiseCoverage(SCENARIOS);
    expect(report.totalPairs).toBe(15);
    expect(report.minimumScenariosPerPair).toBeGreaterThanOrEqual(10);
    expect(report.isSufficient).toBe(true);

    const formattedReport = formatCoverageReport(report);
    expect(formattedReport).toContain('PASS ✅');
  });
});

describe('Match Deck Selection (lib/server/deck.ts)', () => {
  it('selects exactly 16 unique scenarios across 4 rounds (4 clues each)', () => {
    const rounds = selectMatchDeck();
    expect(rounds).toHaveLength(4);

    const allScenarioIds: string[] = [];
    for (const round of rounds) {
      expect(round).toHaveLength(4);
      for (const clue of round) {
        allScenarioIds.push(clue.id);
      }
    }

    expect(allScenarioIds).toHaveLength(16);
    const uniqueIds = new Set(allScenarioIds);
    expect(uniqueIds.size).toBe(16); // Strictly no duplicates in a match
  });

  it('produces deterministic decks when given a seeded PRNG', () => {
    const rng1 = createMulberry32(9999);
    const rng2 = createMulberry32(9999);

    const deck1 = selectMatchDeck(rng1);
    const deck2 = selectMatchDeck(rng2);

    expect(deck1.map((r) => r.map((c) => c.id))).toEqual(
      deck2.map((r) => r.map((c) => c.id))
    );
  });

  it('shuffles option orders while preserving stable option IDs', () => {
    const original = SCENARIOS.find((s) => s.id === 'travel-rain')!;
    const originalOptionIds = new Set(original.options.map((o) => o.id));

    const rounds = selectMatchDeck();
    const found = rounds.flat().find((s) => s.id === 'travel-rain');

    if (found) {
      const foundOptionIds = new Set(found.options.map((o) => o.id));
      expect(foundOptionIds).toEqual(originalOptionIds);
    }
  });

  it('strips editorial metadata completely so client payload is safe', () => {
    const original = SCENARIOS[0];
    const stripped = stripEditorial(original);

    expect(stripped.id).toBe(original.id);
    expect(stripped.prompt).toBe(original.prompt);
    expect(stripped.category).toBe(original.category);
    expect(stripped.options).toHaveLength(original.options.length);

    const record = stripped as unknown as Record<string, unknown>;
    expect(record['editorial']).toBeUndefined();
    expect(record['tags']).toBeUndefined();
    expect(record['plausibleOptionsByRole']).toBeUndefined();
    expect(record['rationaleByRole']).toBeUndefined();
  });
});

describe('Integration: Match Deck with Game Engine', () => {
  it('plays through round 0 using realistic match deck scenarios', () => {
    const deck = selectMatchDeck(createMulberry32(777));
    let state = createInitialGameState('ROOM-DECK-TEST');

    state = processAction(state, {
      type: 'PLAYER_JOIN',
      seat: 0,
      uid: 'p0',
      displayName: 'สมชาย',
      avatarId: 'cat',
    }).state;
    state = processAction(state, {
      type: 'PLAYER_JOIN',
      seat: 1,
      uid: 'p1',
      displayName: 'สมหญิง',
      avatarId: 'rabbit',
    }).state;
    state = processAction(state, { type: 'PLAYER_READY', seat: 0, ready: true }).state;
    state = processAction(state, { type: 'PLAYER_READY', seat: 1, ready: true }).state;

    // Start match using deck[0] (round 0 scenarios)
    state = processAction(state, {
      type: 'START_MATCH',
      rolePair: ['saver', 'comfort'],
      scenarios: deck[0],
    }).state;

    expect(state.phase).toBe('ROLE_INTRO');
    expect(state.currentRound?.scenarios).toHaveLength(4);
    expect(state.currentRound?.scenarios[0].prompt).toBe(deck[0][0].prompt);

    // Acknowledge roles
    state = processAction(state, { type: 'ROLE_ACK', seat: 0 }).state;
    state = processAction(state, { type: 'ROLE_ACK', seat: 1 }).state;

    expect(state.phase).toBe('ANSWERING');
    const firstScenario = deck[0][0];

    // Submit answers using actual options from the scenario
    const opt0 = firstScenario.options[0].id;
    const opt1 = firstScenario.options[1].id;

    state = processAction(state, {
      type: 'SUBMIT_ANSWER',
      seat: 0,
      clueIndex: 0,
      optionId: opt0,
    }).state;
    state = processAction(state, {
      type: 'SUBMIT_ANSWER',
      seat: 1,
      clueIndex: 0,
      optionId: opt1,
    }).state;

    expect(state.phase).toBe('ANSWER_REVEAL');
    expect(state.currentRound?.revealedAnswers[0].answers).toEqual([opt0, opt1]);
  });
});
