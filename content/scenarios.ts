import data from './hidden-identities-v1.json';
import type { Scenario, ScenarioWithEditorial } from '../lib/game/types';

/** Active content only. Legacy matches use their persisted snapshots. */
export const SCENARIOS: ScenarioWithEditorial[] = data.scenarios as ScenarioWithEditorial[];
export const ROUND_PACKS = data.roundPacks;
export const SCENARIO_MAP: ReadonlyMap<string, ScenarioWithEditorial> = new Map(SCENARIOS.map(s => [s.id, s]));
export function getScenarioById(id: string): ScenarioWithEditorial | undefined { return SCENARIO_MAP.get(id); }

/** Explicit allowlist: never publish inference/editorial fields. */
export function stripEditorial(scenario: Scenario): Scenario {
  return { id: scenario.id, version: scenario.version, category: scenario.category, prompt: scenario.prompt,
    options: scenario.options.map(option => ({ id: option.id, label: option.label })) };
}
