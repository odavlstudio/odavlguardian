/**
 * Guardian Rules Engine
 *
 * A minimal, production-grade rule evaluation engine for Guardian.
 * Supports:
 * - JSON-based rule definitions with schema validation
 * - Deterministic rule evaluation (stable ordering)
 * - Composable conditions (comparisons, boolean checks, string matching)
 * - Verdict overrides and minimum verdict floors
 * - Priority-based conflict resolution
 *
 * NO placeholders, NO fake rules, NO optional behavior.
 * This is the authoritative rules engine for Guardian verdicts.
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} Rule
 * @property {string} id - Unique rule identifier (e.g., "failed_attempts")
 * @property {string} description - Human-readable rule description
 * @property {number} priority - Evaluation priority (lower number = higher priority). Determines order when multiple rules trigger.
 * @property {Object} when - Conditions that must be met for rule to trigger
 * @property {Object} then - Action to take when rule triggers
 * @property {string} [category] - Categorization for reporting (TRUST, REVENUE, COMPLIANCE, PERFORMANCE)
 * @property {boolean} [disabled] - If true, skip this rule during evaluation
 */

/**
 * @typedef {Object} PolicyDecision
 * @property {string} finalVerdict - Canonical verdict: READY, FRICTION, or DO_NOT_LAUNCH
 * @property {number} exitCode - Exit code (0=READY, 1=FRICTION, 2=DO_NOT_LAUNCH)
 * @property {string[]} triggeredRuleIds - IDs of rules that triggered during evaluation
 * @property {Object[]} reasons - Array of {ruleId, message, data} objects explaining decision
 * @property {boolean} isBaseline - Whether verdict is from policy override vs baseline
 * @property {Object} policySignals - Raw signals passed to rule evaluator (for audit)
 */

/**
 * Verdict hierarchy (cannot go backwards):
 * READY (best) > FRICTION (middle) > DO_NOT_LAUNCH (worst)
 */
const VERDICT_HIERARCHY = {
  READY: 0,
  FRICTION: 1,
  DO_NOT_LAUNCH: 2
};

/**
 * Standard rule schema validator
 * Validates that a rule object matches the expected structure
 */
function validateRuleSchema(rule, ruleId = '') {
  const errors = [];
  const prefix = ruleId ? `Rule "${ruleId}"` : 'Rule';

  if (!rule || typeof rule !== 'object') {
    return {
      valid: false,
      errors: [`${prefix} must be an object`]
    };
  }

  // Required fields
  if (!rule.id || typeof rule.id !== 'string') {
    errors.push(`${prefix}: id is required and must be a string`);
  }
  if (!rule.description || typeof rule.description !== 'string') {
    errors.push(`${prefix}: description is required and must be a string`);
  }
  if (typeof rule.priority !== 'number') {
    errors.push(`${prefix}: priority is required and must be a number`);
  }
  if (!rule.when || typeof rule.when !== 'object') {
    errors.push(`${prefix}: when (conditions) is required and must be an object`);
  }
  if (!rule.then || typeof rule.then !== 'object') {
    errors.push(`${prefix}: then (action) is required and must be an object`);
  }

  // Validate 'then' verdict if specified
  if (rule.then.verdict) {
    const validVerdicts = Object.keys(VERDICT_HIERARCHY);
    if (!validVerdicts.includes(rule.then.verdict)) {
      errors.push(`${prefix}: then.verdict must be one of: ${validVerdicts.join(', ')}`);
    }
  }

  // Validate 'then.minVerdictFloor' if specified
  if (rule.then.minVerdictFloor) {
    const validVerdicts = Object.keys(VERDICT_HIERARCHY);
    if (!validVerdicts.includes(rule.then.minVerdictFloor)) {
      errors.push(`${prefix}: then.minVerdictFloor must be one of: ${validVerdicts.join(', ')}`);
    }
  }

  // Optional: category validation
  if (rule.category) {
    const validCategories = ['TRUST', 'REVENUE', 'COMPLIANCE', 'PERFORMANCE', 'CONTENT', 'UX'];
    if (!validCategories.includes(rule.category)) {
      errors.push(`${prefix}: category should be one of: ${validCategories.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Load rules from a JSON file or return built-in default rules
 * @param {string} [rulesPath] - Path to rules JSON file
 * @returns {Array} Array of rule objects
 */
function loadRules(rulesPath = null) {
  // Default built-in rules - minimal but real
  const defaultRules = [
    {
      id: 'failed_attempts_exist',
      description: 'Fail if any attempts resulted in FAILURE',
      priority: 10,
      category: 'TRUST',
      when: {
        field: 'failedCount',
        operator: 'greaterThan',
        value: 0
      },
      then: {
        verdict: 'DO_NOT_LAUNCH',
        reason: 'Critical flows failed during execution'
      }
    },
    {
      id: 'no_executed_attempts',
      description: 'Downgrade to FRICTION if no attempts were executed',
      priority: 20,
      category: 'COMPLIANCE',
      when: {
        field: 'executedCount',
        operator: 'equals',
        value: 0
      },
      then: {
        verdict: 'FRICTION',
        reason: 'No attempts were executed; unable to validate real-world behavior'
      }
    },
    {
      id: 'near_success_with_no_failures',
      description: 'Mark FRICTION if near-success attempts exist but no outright failures',
      priority: 30,
      category: 'UX',
      when: {
        conditions: [
          { field: 'nearSuccessCount', operator: 'greaterThan', value: 0 },
          { field: 'failedCount', operator: 'equals', value: 0 }
        ],
        logic: 'AND'
      },
      then: {
        verdict: 'FRICTION',
        reason: 'One or more flows nearly succeeded but did not complete; user confusion likely'
      }
    },
    {
      id: 'goal_not_reached_no_failures',
      description: 'Mark FRICTION if goal was not reached despite no failures',
      priority: 35,
      category: 'UX',
      when: {
        conditions: [
          { field: 'goalReached', operator: 'equals', value: false },
          { field: 'failedCount', operator: 'equals', value: 0 }
        ],
        logic: 'AND'
      },
      then: {
        verdict: 'FRICTION',
        reason: 'Primary goal not achieved; business objective not met'
      }
    },
    {
      id: 'sensitive_domain_with_failures',
      description: 'Escalate to DO_NOT_LAUNCH for payment/checkout domains with failures',
      priority: 15,
      category: 'REVENUE',
      when: {
        conditions: [
          { field: 'domain', operator: 'matches', pattern: '(checkout|payment|cart|billing)' },
          { field: 'failedCount', operator: 'greaterThan', value: 0 }
        ],
        logic: 'AND'
      },
      then: {
        verdict: 'DO_NOT_LAUNCH',
        reason: 'Revenue flow failures detected on checkout/payment domain'
      }
    },
    {
      id: 'baseline_regression',
      description: 'Set to DO_NOT_LAUNCH if baseline regressions detected',
      priority: 25,
      category: 'COMPLIANCE',
      when: {
        field: 'hasRegressions',
        operator: 'equals',
        value: true
      },
      then: {
        verdict: 'DO_NOT_LAUNCH',
        reason: 'Baseline regressions detected; behavior has degraded'
      }
    },
    {
      id: 'all_goals_reached',
      description: 'Allow READY only if goal reached and no failures',
      priority: 50,
      category: 'COMPLIANCE',
      when: {
        conditions: [
          { field: 'goalReached', operator: 'equals', value: true },
          { field: 'failedCount', operator: 'equals', value: 0 },
          { field: 'nearSuccessCount', operator: 'equals', value: 0 }
        ],
        logic: 'AND'
      },
      then: {
        verdict: 'READY',
        reason: 'All critical flows executed successfully and goals reached'
      }
    }
  ];

  // If no path specified, try to find rules file in standard locations
  if (!rulesPath) {
    const candidates = [
      'config/guardian.rules.json',
      'guardian.rules.json',
      '.odavl-guardian/rules.json',
      '.odavl-guardian/guardian.rules.json'
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        rulesPath = candidate;
        break;
      }
    }
  }

  // If no rules file found, use defaults
  if (!rulesPath || !fs.existsSync(rulesPath)) {
    return defaultRules;
  }

  try {
    const json = fs.readFileSync(rulesPath, 'utf8');
    const loaded = JSON.parse(json);

    // Validate each loaded rule
    const rules = Array.isArray(loaded) ? loaded : [loaded];
    for (const rule of rules) {
      const validation = validateRuleSchema(rule, rule.id);
      if (!validation.valid) {
        throw new Error(`Invalid rule schema for "${rule.id}": ${validation.errors.join('; ')}`);
      }
      if (rule.disabled) {
        // Mark disabled rules but keep them for audit trail
        rule._disabled = true;
      }
    }

    return rules;
  } catch (e) {
    throw new Error(`Failed to load rules from ${rulesPath}: ${e.message}`);
  }
}

/**
 * Evaluate a single condition within a rule
 * Supports: equals, greaterThan, lessThan, matches (regex), contains
 */
function evaluateCondition(condition, signals) {
  const { field, operator, value, pattern } = condition;

  // Get value from signals
  const fieldValue = signals[field];

  switch (operator) {
    case 'equals':
      return fieldValue === value;

    case 'greaterThan':
      return typeof fieldValue === 'number' && fieldValue > value;

    case 'lessThan':
      return typeof fieldValue === 'number' && fieldValue < value;

    case 'matches':
      if (typeof pattern !== 'string') {
        throw new Error(`Condition "${field} matches" requires a 'pattern' string`);
      }
      try {
        const regex = new RegExp(pattern, 'i');
        return regex.test(String(fieldValue));
      } catch (e) {
        throw new Error(`Invalid regex pattern in condition: ${e.message}`);
      }

    case 'contains':
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(value);
      }
      return String(fieldValue).includes(String(value));

    default:
      throw new Error(`Unknown condition operator: ${operator}`);
  }
}

/**
 * Evaluate the 'when' (conditions) part of a rule
 * Returns true if conditions are met, false otherwise
 */
function evaluateWhenConditions(whenClause, signals) {
  if (!whenClause) return false;

  // Single condition case
  if (whenClause.field) {
    return evaluateCondition(whenClause, signals);
  }

  // Multi-condition case (AND/OR logic)
  if (Array.isArray(whenClause.conditions)) {
    const logic = whenClause.logic || 'AND';
    const results = whenClause.conditions.map(cond => evaluateCondition(cond, signals));

    if (logic === 'AND') {
      return results.every(r => r === true);
    } else if (logic === 'OR') {
      return results.some(r => r === true);
    } else {
      throw new Error(`Unknown logic operator: ${logic}`);
    }
  }

  return false;
}

/**
 * Merge two verdicts respecting hierarchy (higher severity wins)
 */
function mergeVerdicts(v1, v2) {
  const h1 = VERDICT_HIERARCHY[v1] ?? -1;
  const h2 = VERDICT_HIERARCHY[v2] ?? -1;
  return h1 > h2 ? v1 : v2;
}

/**
 * Evaluate a set of rules against scan signals
 * Returns a PolicyDecision object with final verdict and triggered rules
 */
function evaluateRules(rules, policySignals) {
  if (!Array.isArray(rules)) {
    throw new Error('Rules must be an array');
  }

  if (!policySignals || typeof policySignals !== 'object') {
    throw new Error('policySignals must be an object with scan data');
  }

  const decision = {
    finalVerdict: 'READY', // Start optimistic
    exitCode: 0,
    triggeredRuleIds: [],
    reasons: [],
    isBaseline: false,
    policySignals: policySignals
  };

  // Sort rules by priority (lower number = higher priority = evaluated first)
  const sortedRules = rules
    .filter(r => !r.disabled && !r._disabled)
    .sort((a, b) => a.priority - b.priority);

  // Evaluate each rule
  for (const rule of sortedRules) {
    try {
      const conditionsMet = evaluateWhenConditions(rule.when, policySignals);

      if (conditionsMet) {
        // Rule triggered
        decision.triggeredRuleIds.push(rule.id);

        // Apply verdict override or floor
        if (rule.then.verdict) {
          const newVerdict = rule.then.verdict;
          decision.finalVerdict = mergeVerdicts(decision.finalVerdict, newVerdict);
        }

        // Apply minimum verdict floor (ensure we don't go better than this)
        if (rule.then.minVerdictFloor) {
          const currentHierarchy = VERDICT_HIERARCHY[decision.finalVerdict];
          const floorHierarchy = VERDICT_HIERARCHY[rule.then.minVerdictFloor];
          if (currentHierarchy < floorHierarchy) {
            decision.finalVerdict = rule.then.minVerdictFloor;
          }
        }

        // Record reason
        decision.reasons.push({
          ruleId: rule.id,
          message: rule.then.reason || rule.description,
          category: rule.category || 'GENERAL',
          priority: rule.priority
        });
      }
    } catch (e) {
      throw new Error(`Error evaluating rule "${rule.id}": ${e.message}`);
    }
  }

  // Map final verdict to exit code
  decision.exitCode = mapVerdictToExitCode(decision.finalVerdict);

  // Sort reasons by priority for consistent output
  decision.reasons.sort((a, b) => a.priority - b.priority || a.ruleId.localeCompare(b.ruleId));

  return decision;
}

/**
 * Map canonical verdict to exit code
 * READY (0) > FRICTION (1) > DO_NOT_LAUNCH (2)
 */
function mapVerdictToExitCode(verdict) {
  switch (verdict) {
    case 'READY':
      return 0;
    case 'FRICTION':
      return 1;
    case 'DO_NOT_LAUNCH':
      return 2;
    default:
      return 2; // Fail safe
  }
}

/**
 * Build policy signals object from scan results
 * This is the input data that rules operate on
 */
function buildPolicySignals(scanResult) {
  if (!scanResult || typeof scanResult !== 'object') {
    throw new Error('scanResult must be an object');
  }

  const attempts = scanResult.attempts || [];
  const executed = attempts.filter(a => a.executed);
  const failed = executed.filter(a => a.outcome === 'FAILURE');
  const nearSuccess = executed.filter(a => {
    // Near-success: execution occurred but goal not reached without explicit failure
    return a.outcome === 'FRICTION' || (a.outcome !== 'SUCCESS' && a.outcome !== 'FAILURE');
  });

  return {
    // Basic counts
    executedCount: executed.length,
    failedCount: failed.length,
    nearSuccessCount: nearSuccess.length,
    successCount: executed.filter(a => a.outcome === 'SUCCESS').length,
    frictionCount: executed.filter(a => a.outcome === 'FRICTION').length,
    skippedCount: attempts.filter(a => !a.executed).length,

    // Boolean flags
    goalReached: scanResult.goalReached === true || (scanResult.meta?.goalReached === true),
    hasScreenshots: (scanResult.evidence?.screenshots?.length || 0) > 0,
    hasTraces: (scanResult.evidence?.traces?.length || 0) > 0,
    hasRegressions: !!(scanResult.baseline?.diffResult?.regressions && Object.keys(scanResult.baseline.diffResult.regressions).length > 0),

    // Domain/URL matching
    domain: extractDomain(scanResult.url || scanResult.baseUrl),
    url: scanResult.url || scanResult.baseUrl,

    // Preset/policy name
    preset: scanResult.preset || scanResult.policy,

    // Raw counts for advanced rules
    attemptTotal: attempts.length,
    executionCoverage: attempts.length > 0 ? executed.length / attempts.length : 0
  };
}

/**
 * Extract domain from URL for pattern matching
 */
function extractDomain(urlString) {
  if (!urlString) return '';
  try {
    const url = new URL(urlString);
    return url.hostname;
  } catch {
    return '';
  }
}

/**
 * Create a default rules file in standard location
 */
function createDefaultRulesFile(outputPath = 'config/guardian.rules.json') {
  const defaultRules = [
    {
      id: 'failed_attempts_exist',
      description: 'Fail if any attempts resulted in FAILURE',
      priority: 10,
      category: 'TRUST',
      when: { field: 'failedCount', operator: 'greaterThan', value: 0 },
      then: { verdict: 'DO_NOT_LAUNCH', reason: 'Critical flows failed during execution' }
    },
    {
      id: 'no_executed_attempts',
      description: 'Downgrade to FRICTION if no attempts were executed',
      priority: 20,
      category: 'COMPLIANCE',
      when: { field: 'executedCount', operator: 'equals', value: 0 },
      then: { verdict: 'FRICTION', reason: 'No attempts were executed; unable to validate real-world behavior' }
    }
  ];

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(defaultRules, null, 2), 'utf8');
  return outputPath;
}

module.exports = {
  // Core functions
  loadRules,
  evaluateRules,
  buildPolicySignals,
  evaluateWhenConditions,
  evaluateCondition,
  mergeVerdicts,

  // Utilities
  validateRuleSchema,
  createDefaultRulesFile,
  mapVerdictToExitCode,
  extractDomain,

  // Constants
  VERDICT_HIERARCHY
};
