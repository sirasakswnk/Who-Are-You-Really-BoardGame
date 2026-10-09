/**
 * Content Validator and 15-Pair Coverage Analyzer
 * Ensures structural integrity, editorial rigor, and role distinguishability coverage
 */

import { ScenarioWithEditorial, RoleId, ROLE_IDS, ScenarioCategory } from '../lib/game/types';

export interface ValidationIssue {
  scenarioId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface CatalogValidationResult {
  isValid: boolean;
  totalScenarios: number;
  categoryCounts: Record<ScenarioCategory, number>;
  issues: ValidationIssue[];
}

export interface PairwiseDistinguishability {
  pair: [RoleId, RoleId];
  pairLabel: string;
  distinguishingCount: number;
  distinguishingScenarioIds: string[];
}

export interface CoverageReport {
  isSufficient: boolean;
  totalPairs: number;
  minimumScenariosPerPair: number;
  pairDetails: PairwiseDistinguishability[];
}

const VALID_CATEGORIES: ScenarioCategory[] = [
  'travel',
  'food',
  'shopping',
  'leisure',
  'friends',
  'daily',
];

/**
 * Validates a single scenario's structure and editorial metadata.
 */
export function validateScenario(scenario: ScenarioWithEditorial): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { id, category, prompt, options, editorial } = scenario;

  if (!id || typeof id !== 'string') {
    issues.push({ scenarioId: id, field: 'id', message: 'Scenario ID is empty or invalid', severity: 'error' });
  }

  if (!VALID_CATEGORIES.includes(category)) {
    issues.push({ scenarioId: id, field: 'category', message: `Invalid category: ${category}`, severity: 'error' });
  }

  if (!prompt || prompt.trim().length === 0) {
    issues.push({ scenarioId: id, field: 'prompt', message: 'Prompt is empty', severity: 'error' });
  }

  if (!Array.isArray(options) || options.length < 3 || options.length > 4) {
    issues.push({
      scenarioId: id,
      field: 'options',
      message: `Scenario must have 3-4 options, got ${options?.length}`,
      severity: 'error',
    });
  }

  const optionIds = new Set<string>();
  for (const opt of options || []) {
    if (!opt.id || typeof opt.id !== 'string') {
      issues.push({ scenarioId: id, field: 'options', message: 'Option has empty or invalid ID', severity: 'error' });
    }
    if (optionIds.has(opt.id)) {
      issues.push({ scenarioId: id, field: 'options', message: `Duplicate option ID: ${opt.id}`, severity: 'error' });
    }
    optionIds.add(opt.id);

    if (!opt.label || opt.label.trim().length === 0) {
      issues.push({ scenarioId: id, field: 'options', message: `Option ${opt.id} has empty label`, severity: 'error' });
    }
  }

  // Check option length balance (variance check)
  if (options && options.length >= 3) {
    const lengths = options.map((o) => o.label.length);
    const minLen = Math.min(...lengths);
    const maxLen = Math.max(...lengths);
    // If one option is 10x longer than another, flag a warning
    if (maxLen > minLen * 5 && minLen > 0) {
      issues.push({
        scenarioId: id,
        field: 'options.label',
        message: `Option lengths have large variance (min: ${minLen}, max: ${maxLen})`,
        severity: 'warning',
      });
    }
  }

  // Editorial metadata validation
  if (!editorial) {
    issues.push({ scenarioId: id, field: 'editorial', message: 'Editorial metadata is missing', severity: 'error' });
    return issues;
  }

  if (editorial.difficulty !== 'broad' && editorial.difficulty !== 'distinguishing') {
    issues.push({
      scenarioId: id,
      field: 'editorial.difficulty',
      message: `Invalid difficulty: ${editorial.difficulty}`,
      severity: 'error',
    });
  }

  // Every role in ROLE_IDS must have at least 1 plausible option
  for (const role of ROLE_IDS) {
    const plausible = editorial.plausibleOptionsByRole[role];
    if (!plausible || !Array.isArray(plausible) || plausible.length === 0) {
      issues.push({
        scenarioId: id,
        field: `editorial.plausibleOptionsByRole.${role}`,
        message: `Role ${role} has no plausible options assigned`,
        severity: 'error',
      });
    } else {
      // All referenced options must actually exist in the scenario
      for (const optId of plausible) {
        if (!optionIds.has(optId)) {
          issues.push({
            scenarioId: id,
            field: `editorial.plausibleOptionsByRole.${role}`,
            message: `Referenced option ID '${optId}' does not exist in options list`,
            severity: 'error',
          });
        }
      }
    }

    const rationale = editorial.rationaleByRole[role];
    if (!rationale || rationale.trim().length === 0) {
      issues.push({
        scenarioId: id,
        field: `editorial.rationaleByRole.${role}`,
        message: `Role ${role} is missing rationale text`,
        severity: 'error',
      });
    }
  }

  return issues;
}

/**
 * Validates the entire scenario catalog.
 */
export function validateCatalog(scenarios: ScenarioWithEditorial[]): CatalogValidationResult {
  const allIssues: ValidationIssue[] = [];
  const seenIds = new Set<string>();

  const categoryCounts: Record<ScenarioCategory, number> = {
    travel: 0,
    food: 0,
    shopping: 0,
    leisure: 0,
    friends: 0,
    daily: 0,
  };

  for (const s of scenarios) {
    if (seenIds.has(s.id)) {
      allIssues.push({
        scenarioId: s.id,
        field: 'id',
        message: `Duplicate scenario ID across catalog: ${s.id}`,
        severity: 'error',
      });
    }
    seenIds.add(s.id);

    if (VALID_CATEGORIES.includes(s.category)) {
      categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
    }

    const issues = validateScenario(s);
    allIssues.push(...issues);
  }

  // Check category distribution (expected exactly 4 per category)
  for (const cat of VALID_CATEGORIES) {
    if (categoryCounts[cat] !== 4) {
      allIssues.push({
        scenarioId: 'catalog',
        field: `category.${cat}`,
        message: `Category ${cat} has ${categoryCounts[cat]} scenarios (expected 4)`,
        severity: 'error',
      });
    }
  }

  const hasErrors = allIssues.some((i) => i.severity === 'error');

  return {
    isValid: !hasErrors,
    totalScenarios: scenarios.length,
    categoryCounts,
    issues: allIssues,
  };
}

/**
 * Analyzes distinguishability for all 15 unordered role pairs.
 * A scenario distinguishes role A and role B if their plausible option sets are distinct (P(A) != P(B)).
 */
export function analyzePairwiseCoverage(scenarios: ScenarioWithEditorial[]): CoverageReport {
  const pairDetails: PairwiseDistinguishability[] = [];

  for (let i = 0; i < ROLE_IDS.length; i++) {
    for (let j = i + 1; j < ROLE_IDS.length; j++) {
      const r1 = ROLE_IDS[i];
      const r2 = ROLE_IDS[j];
      const distinguishingScenarios: string[] = [];

      for (const s of scenarios) {
        const opts1 = new Set(s.editorial.plausibleOptionsByRole[r1] || []);
        const opts2 = new Set(s.editorial.plausibleOptionsByRole[r2] || []);

        // Distinguishable if they don't have identical plausible option sets
        const hasDiff1 = [...opts1].some((opt) => !opts2.has(opt));
        const hasDiff2 = [...opts2].some((opt) => !opts1.has(opt));

        if (hasDiff1 || hasDiff2) {
          distinguishingScenarios.push(s.id);
        }
      }

      pairDetails.push({
        pair: [r1, r2],
        pairLabel: `${r1} vs ${r2}`,
        distinguishingCount: distinguishingScenarios.length,
        distinguishingScenarioIds: distinguishingScenarios,
      });
    }
  }

  const minScenarios = Math.min(...pairDetails.map((p) => p.distinguishingCount));
  // Every pair should be distinguished by at least 10 scenarios out of 24
  const isSufficient = minScenarios >= 10;

  return {
    isSufficient,
    totalPairs: pairDetails.length, // 15
    minimumScenariosPerPair: minScenarios,
    pairDetails,
  };
}

/**
 * Formats the coverage report as readable markdown.
 */
export function formatCoverageReport(report: CoverageReport): string {
  let md = `# Content Distinguishability Coverage Report\n\n`;
  md += `- **Total Unordered Pairs**: ${report.totalPairs} (15 pairs)\n`;
  md += `- **Minimum Distinguishing Scenarios per Pair**: ${report.minimumScenariosPerPair} / 24\n`;
  md += `- **Sufficient Coverage**: ${report.isSufficient ? 'PASS ✅' : 'FAIL ❌'}\n\n`;
  md += `| Role Pair | Distinguishing Scenarios | Coverage % |\n`;
  md += `|-----------|--------------------------|------------|\n`;

  for (const detail of report.pairDetails) {
    const pct = Math.round((detail.distinguishingCount / 24) * 100);
    md += `| ${detail.pairLabel} | ${detail.distinguishingCount} / 24 | ${pct}% |\n`;
  }

  return md;
}
