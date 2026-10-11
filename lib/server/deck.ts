import { type Scenario } from '../game/types';
import { ROUND_PACKS, getScenarioById, stripEditorial } from '../../content/scenarios';

export function shuffleArray<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Reserve all four packs once per match, independently of roles. Keep clue order. */
export function selectMatchDeck(rng: () => number = Math.random): Scenario[][] {
  return shuffleArray(ROUND_PACKS, rng).map(pack => pack.scenarioIds.map(id => {
    const scenario = getScenarioById(id);
    if (!scenario) throw new Error('Invalid round pack reference');
    const clean = stripEditorial(scenario);
    return { ...clean, options: shuffleArray(clean.options, rng) };
  }));
}
