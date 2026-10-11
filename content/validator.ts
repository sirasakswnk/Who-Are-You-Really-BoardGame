import { CLUES_PER_ROUND, ROUNDS_PER_MATCH, KNOWN_ROLE_IDS, type ScenarioWithEditorial } from '../lib/game/types';
import { ROUND_PACKS } from './scenarios';

export interface ValidationIssue { scenarioId: string; field: string; message: string; severity: 'error' | 'warning' }
const categories = ['social', 'task', 'activity', 'location', 'reaction', 'travel', 'objects', 'schedule'];
export function validateScenario(scenario: ScenarioWithEditorial): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (field: string, message: string) => issues.push({ scenarioId: scenario.id, field, message, severity: 'error' });
  if (!scenario.id?.trim()) error('id', 'Missing scenario ID');
  if (!Number.isInteger(scenario.version) || scenario.version < 1) error('version', 'Invalid scenario version');
  if (!categories.includes(scenario.category)) error('category', 'Invalid category');
  if (!scenario.prompt?.trim()) error('prompt', 'Empty prompt');
  if (scenario.options?.length !== 4) error('options', 'Exactly four options required');
  const ids = new Set<string>();
  for (const option of scenario.options ?? []) {
    if (!option.id?.trim() || ids.has(option.id)) error('options.id', 'Missing or duplicate option ID');
    ids.add(option.id);
    if (!option.label?.trim()) error('options.label', 'Empty option label');
  }
  if (scenario.editorial) {
    for (const [role, options] of Object.entries(scenario.editorial.plausibleOptionsByRole)) {
      if (!KNOWN_ROLE_IDS.some(id => id === role) || options?.some(id => !ids.has(id))) error('editorial', 'Invalid editorial reference');
    }
  }
  return issues;
}

/** Integrity only. No category quotas or invented role-to-answer mappings. */
export function validateCatalog(scenarios: ScenarioWithEditorial[], packs: readonly { id: string; scenarioIds: readonly string[] }[] = ROUND_PACKS) {
  const issues = scenarios.flatMap(validateScenario);
  const error = (field: string, message: string) => issues.push({ scenarioId: 'catalog', field, message, severity: 'error' as const });
  const required = ROUNDS_PER_MATCH * CLUES_PER_ROUND;
  const ids = new Set(scenarios.map(s => s.id));
  if (scenarios.length !== required) error('count', `Expected ${required} scenarios`);
  if (ids.size !== scenarios.length) error('id', 'Duplicate scenario IDs');
  const optionIds = scenarios.flatMap(s => s.options.map(o => o.id));
  if (new Set(optionIds).size !== optionIds.length) error('options.id', 'Duplicate option IDs across catalog');
  if (packs.length !== ROUNDS_PER_MATCH || new Set(packs.map(p => p.id)).size !== packs.length) error('packs', 'Invalid pack count or duplicate pack IDs');
  const references = packs.flatMap(pack => {
    if (pack.scenarioIds.length !== CLUES_PER_ROUND) error('packs', 'Each pack needs four clues');
    return [...pack.scenarioIds];
  });
  if (references.length !== required || new Set(references).size !== required || references.some(id => !ids.has(id))) error('packs', 'Packs must cover the catalog exactly once');
  const categoryCounts: Record<string, number> = {};
  for (const scenario of scenarios) categoryCounts[scenario.category] = (categoryCounts[scenario.category] ?? 0) + 1;
  return { isValid: !issues.some(issue => issue.severity === 'error'), totalScenarios: scenarios.length, categoryCounts, issues,
    balanceStatus: 'unassessed' as const };
}
