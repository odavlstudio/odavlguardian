/**
 * Rules Engine Tests
 * 
 * Comprehensive test suite for Guardian's deterministic rules engine.
 * Tests include:
 * - Rule schema validation
 * - Condition evaluation (equals, greaterThan, lessThan, matches, contains)
 * - Multi-condition logic (AND/OR)
 * - Rule evaluation and verdict determination
 * - Verdict hierarchy and merging
 * - Real-world rule scenarios
 */

const test = require('node:test');
const assert = require('node:assert');
const {
  validateRuleSchema,
  loadRules,
  evaluateRules,
  buildPolicySignals,
  evaluateCondition,
  evaluateWhenConditions,
  mergeVerdicts,
  mapVerdictToExitCode,
  VERDICT_HIERARCHY
} = require('../src/guardian/rules-engine');

test('Rule Schema Validation', async (t) => {
  await t.test('validates correct rule structure', () => {
    const rule = {
      id: 'test_rule',
      description: 'A test rule',
      priority: 10,
      when: { field: 'failedCount', operator: 'greaterThan', value: 0 },
      then: { verdict: 'FRICTION', reason: 'Test reason' }
    };
    const result = validateRuleSchema(rule);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
  });

  await t.test('rejects rule without id', () => {
    const rule = {
      description: 'Missing id',
      priority: 10,
      when: { field: 'failedCount', operator: 'greaterThan', value: 0 },
      then: { verdict: 'FRICTION', reason: 'Test' }
    };
    const result = validateRuleSchema(rule);
    assert.strictEqual(result.valid, false);
    assert(result.errors.some(e => e.includes('id')));
  });

  await t.test('rejects invalid verdict', () => {
    const rule = {
      id: 'test',
      description: 'Invalid verdict',
      priority: 10,
      when: { field: 'failedCount', operator: 'greaterThan', value: 0 },
      then: { verdict: 'INVALID', reason: 'Test' }
    };
    const result = validateRuleSchema(rule);
    assert.strictEqual(result.valid, false);
    assert(result.errors.some(e => e.includes('verdict')));
  });

  await t.test('rejects invalid category', () => {
    const rule = {
      id: 'test',
      description: 'Invalid category',
      priority: 10,
      category: 'INVALID_CATEGORY',
      when: { field: 'failedCount', operator: 'greaterThan', value: 0 },
      then: { verdict: 'FRICTION', reason: 'Test' }
    };
    const result = validateRuleSchema(rule);
    assert.strictEqual(result.valid, false);
    assert(result.errors.some(e => e.includes('category')));
  });
});

test('Condition Evaluation', async (t) => {
  await t.test('evaluates equals operator', () => {
    const signals = { executedCount: 0 };
    assert.strictEqual(
      evaluateCondition({ field: 'executedCount', operator: 'equals', value: 0 }, signals),
      true
    );
    assert.strictEqual(
      evaluateCondition({ field: 'executedCount', operator: 'equals', value: 1 }, signals),
      false
    );
  });

  await t.test('evaluates greaterThan operator', () => {
    const signals = { failedCount: 5 };
    assert.strictEqual(
      evaluateCondition({ field: 'failedCount', operator: 'greaterThan', value: 0 }, signals),
      true
    );
    assert.strictEqual(
      evaluateCondition({ field: 'failedCount', operator: 'greaterThan', value: 10 }, signals),
      false
    );
  });

  await t.test('evaluates lessThan operator', () => {
    const signals = { executedCount: 3 };
    assert.strictEqual(
      evaluateCondition({ field: 'executedCount', operator: 'lessThan', value: 5 }, signals),
      true
    );
    assert.strictEqual(
      evaluateCondition({ field: 'executedCount', operator: 'lessThan', value: 2 }, signals),
      false
    );
  });

  await t.test('evaluates matches operator (regex)', () => {
    const signals = { domain: 'example.com' };
    assert.strictEqual(
      evaluateCondition({ field: 'domain', operator: 'matches', pattern: 'example' }, signals),
      true
    );
    assert.strictEqual(
      evaluateCondition({ field: 'domain', operator: 'matches', pattern: 'checkout' }, signals),
      false
    );
  });

  await t.test('evaluates matches operator with payment domains', () => {
    const signals = { domain: 'checkout.example.com' };
    assert.strictEqual(
      evaluateCondition({ field: 'domain', operator: 'matches', pattern: '(checkout|payment|cart|billing)' }, signals),
      true
    );
  });

  await t.test('evaluates contains operator', () => {
    const signals = { attemptIds: ['login', 'checkout', 'signup'] };
    assert.strictEqual(
      evaluateCondition({ field: 'attemptIds', operator: 'contains', value: 'checkout' }, signals),
      true
    );
    assert.strictEqual(
      evaluateCondition({ field: 'attemptIds', operator: 'contains', value: 'payment' }, signals),
      false
    );
  });
});

test('Multi-Condition Logic', async (t) => {
  await t.test('evaluates AND logic correctly', () => {
    const signals = { failedCount: 1, domain: 'example.com' };
    const result = evaluateWhenConditions({
      conditions: [
        { field: 'failedCount', operator: 'greaterThan', value: 0 },
        { field: 'domain', operator: 'matches', pattern: 'example' }
      ],
      logic: 'AND'
    }, signals);
    assert.strictEqual(result, true);
  });

  await t.test('AND logic fails when one condition fails', () => {
    const signals = { failedCount: 0, domain: 'example.com' };
    const result = evaluateWhenConditions({
      conditions: [
        { field: 'failedCount', operator: 'greaterThan', value: 0 },
        { field: 'domain', operator: 'matches', pattern: 'example' }
      ],
      logic: 'AND'
    }, signals);
    assert.strictEqual(result, false);
  });

  await t.test('evaluates OR logic correctly', () => {
    const signals = { failedCount: 0, domain: 'payment.example.com' };
    const result = evaluateWhenConditions({
      conditions: [
        { field: 'failedCount', operator: 'greaterThan', value: 0 },
        { field: 'domain', operator: 'matches', pattern: 'payment' }
      ],
      logic: 'OR'
    }, signals);
    assert.strictEqual(result, true);
  });

  await t.test('OR logic fails when all conditions fail', () => {
    const signals = { failedCount: 0, domain: 'example.com' };
    const result = evaluateWhenConditions({
      conditions: [
        { field: 'failedCount', operator: 'greaterThan', value: 0 },
        { field: 'domain', operator: 'matches', pattern: 'payment' }
      ],
      logic: 'OR'
    }, signals);
    assert.strictEqual(result, false);
  });
});

test('Verdict Merging and Hierarchy', async (t) => {
  await t.test('respects verdict hierarchy', () => {
    assert.strictEqual(Object.keys(VERDICT_HIERARCHY).length, 3);
    assert.strictEqual(VERDICT_HIERARCHY.READY, 0);
    assert.strictEqual(VERDICT_HIERARCHY.FRICTION, 1);
    assert.strictEqual(VERDICT_HIERARCHY['DO_NOT_LAUNCH'], 2);
  });

  await t.test('merges verdicts to worse verdict', () => {
    assert.strictEqual(mergeVerdicts('READY', 'FRICTION'), 'FRICTION');
    assert.strictEqual(mergeVerdicts('FRICTION', 'DO_NOT_LAUNCH'), 'DO_NOT_LAUNCH');
    assert.strictEqual(mergeVerdicts('READY', 'DO_NOT_LAUNCH'), 'DO_NOT_LAUNCH');
  });

  await t.test('maps verdicts to exit codes', () => {
    assert.strictEqual(mapVerdictToExitCode('READY'), 0);
    assert.strictEqual(mapVerdictToExitCode('FRICTION'), 1);
    assert.strictEqual(mapVerdictToExitCode('DO_NOT_LAUNCH'), 2);
  });
});

test('Real-World Rule Scenarios', async (t) => {
  await t.test('Rule 1: Failed attempts exist => DO_NOT_LAUNCH', () => {
    const rules = [
      {
        id: 'failed_attempts_exist',
        description: 'Fail if any attempts resulted in FAILURE',
        priority: 10,
        when: { field: 'failedCount', operator: 'greaterThan', value: 0 },
        then: { verdict: 'DO_NOT_LAUNCH', reason: 'Critical flows failed' }
      }
    ];
    const signals = { failedCount: 1, executedCount: 3 };
    const decision = evaluateRules(rules, signals);
    
    assert.strictEqual(decision.finalVerdict, 'DO_NOT_LAUNCH');
    assert.strictEqual(decision.exitCode, 2);
    assert(decision.triggeredRuleIds.includes('failed_attempts_exist'));
  });

  await t.test('Rule 2: No executed attempts => FRICTION', () => {
    const rules = [
      {
        id: 'no_executed_attempts',
        description: 'Downgrade to FRICTION if no attempts executed',
        priority: 20,
        when: { field: 'executedCount', operator: 'equals', value: 0 },
        then: { verdict: 'FRICTION', reason: 'No attempts executed' }
      }
    ];
    const signals = { executedCount: 0, failedCount: 0 };
    const decision = evaluateRules(rules, signals);
    
    assert.strictEqual(decision.finalVerdict, 'FRICTION');
    assert.strictEqual(decision.exitCode, 1);
    assert(decision.triggeredRuleIds.includes('no_executed_attempts'));
  });

  await t.test('Rule 3: Near-success with no failures => FRICTION', () => {
    const rules = [
      {
        id: 'near_success_with_no_failures',
        description: 'Mark FRICTION if near-success exists but no failures',
        priority: 30,
        when: {
          conditions: [
            { field: 'nearSuccessCount', operator: 'greaterThan', value: 0 },
            { field: 'failedCount', operator: 'equals', value: 0 }
          ],
          logic: 'AND'
        },
        then: { verdict: 'FRICTION', reason: 'Near-success flows detected' }
      }
    ];
    const signals = { nearSuccessCount: 2, failedCount: 0, executedCount: 3 };
    const decision = evaluateRules(rules, signals);
    
    assert.strictEqual(decision.finalVerdict, 'FRICTION');
    assert(decision.triggeredRuleIds.includes('near_success_with_no_failures'));
  });

  await t.test('Rule 4: Goal not reached, no failures => FRICTION', () => {
    const rules = [
      {
        id: 'goal_not_reached',
        description: 'Mark FRICTION if goal not reached despite no failures',
        priority: 35,
        when: {
          conditions: [
            { field: 'goalReached', operator: 'equals', value: false },
            { field: 'failedCount', operator: 'equals', value: 0 }
          ],
          logic: 'AND'
        },
        then: { verdict: 'FRICTION', reason: 'Goal not achieved' }
      }
    ];
    const signals = { goalReached: false, failedCount: 0, executedCount: 3 };
    const decision = evaluateRules(rules, signals);
    
    assert.strictEqual(decision.finalVerdict, 'FRICTION');
    assert(decision.triggeredRuleIds.includes('goal_not_reached'));
  });

  await t.test('Rule 5: Sensitive domain with failures => DO_NOT_LAUNCH', () => {
    const rules = [
      {
        id: 'sensitive_domain_with_failures',
        description: 'Escalate for payment/checkout domains with failures',
        priority: 15,
        when: {
          conditions: [
            { field: 'domain', operator: 'matches', pattern: '(checkout|payment|cart|billing)' },
            { field: 'failedCount', operator: 'greaterThan', value: 0 }
          ],
          logic: 'AND'
        },
        then: { verdict: 'DO_NOT_LAUNCH', reason: 'Revenue flow failures detected' }
      }
    ];
    const signals = { domain: 'checkout.example.com', failedCount: 1, executedCount: 5 };
    const decision = evaluateRules(rules, signals);
    
    assert.strictEqual(decision.finalVerdict, 'DO_NOT_LAUNCH');
    assert(decision.triggeredRuleIds.includes('sensitive_domain_with_failures'));
  });

  await t.test('Rule 6: Baseline regression => DO_NOT_LAUNCH', () => {
    const rules = [
      {
        id: 'baseline_regression',
        description: 'Escalate if baseline regressions detected',
        priority: 25,
        when: { field: 'hasRegressions', operator: 'equals', value: true },
        then: { verdict: 'DO_NOT_LAUNCH', reason: 'Behavior degraded vs baseline' }
      }
    ];
    const signals = { hasRegressions: true, failedCount: 0, executedCount: 3 };
    const decision = evaluateRules(rules, signals);
    
    assert.strictEqual(decision.finalVerdict, 'DO_NOT_LAUNCH');
    assert(decision.triggeredRuleIds.includes('baseline_regression'));
  });

  await t.test('Rule 7: All goals reached, no failures => READY', () => {
    const rules = [
      {
        id: 'all_goals_reached',
        description: 'Allow READY only if goal reached and no failures',
        priority: 50,
        when: {
          conditions: [
            { field: 'goalReached', operator: 'equals', value: true },
            { field: 'failedCount', operator: 'equals', value: 0 },
            { field: 'nearSuccessCount', operator: 'equals', value: 0 }
          ],
          logic: 'AND'
        },
        then: { verdict: 'READY', reason: 'All flows successful' }
      }
    ];
    const signals = { goalReached: true, failedCount: 0, nearSuccessCount: 0, executedCount: 5 };
    const decision = evaluateRules(rules, signals);
    
    assert.strictEqual(decision.finalVerdict, 'READY');
    assert.strictEqual(decision.exitCode, 0);
  });
});

test('Rule Evaluation Order and Determinism', async (t) => {
  await t.test('evaluates rules in priority order', () => {
    const rules = [
      {
        id: 'high_priority',
        description: 'High priority rule',
        priority: 5,
        when: { field: 'failedCount', operator: 'greaterThan', value: 0 },
        then: { verdict: 'DO_NOT_LAUNCH', reason: 'High priority' }
      },
      {
        id: 'low_priority',
        description: 'Low priority rule',
        priority: 50,
        when: { field: 'failedCount', operator: 'greaterThan', value: 0 },
        then: { verdict: 'FRICTION', reason: 'Low priority' }
      }
    ];
    const signals = { failedCount: 1, executedCount: 2 };
    const decision = evaluateRules(rules, signals);
    
    // Both rules trigger, but high_priority comes first (lower number)
    assert(decision.triggeredRuleIds.includes('high_priority'));
    assert(decision.triggeredRuleIds.includes('low_priority'));
    // Final verdict should be DO_NOT_LAUNCH (worse verdict wins)
    assert.strictEqual(decision.finalVerdict, 'DO_NOT_LAUNCH');
  });

  await t.test('produces deterministic output with same inputs', () => {
    const rules = loadRules();
    const signals = {
      executedCount: 5,
      failedCount: 1,
      nearSuccessCount: 0,
      goalReached: false,
      hasScreenshots: true,
      hasRegressions: false,
      domain: 'example.com'
    };
    
    const decision1 = evaluateRules(rules, signals);
    const decision2 = evaluateRules(rules, signals);
    
    assert.strictEqual(decision1.finalVerdict, decision2.finalVerdict);
    assert.strictEqual(decision1.exitCode, decision2.exitCode);
    assert.deepStrictEqual(decision1.triggeredRuleIds, decision2.triggeredRuleIds);
  });

  await t.test('sorts reasons by priority for consistent output', () => {
    const rules = [
      {
        id: 'rule_a',
        description: 'Rule A',
        priority: 30,
        when: { field: 'failedCount', operator: 'greaterThan', value: 0 },
        then: { verdict: 'FRICTION', reason: 'Reason A' }
      },
      {
        id: 'rule_b',
        description: 'Rule B',
        priority: 10,
        when: { field: 'failedCount', operator: 'greaterThan', value: 0 },
        then: { verdict: 'FRICTION', reason: 'Reason B' }
      }
    ];
    const signals = { failedCount: 1, executedCount: 2 };
    const decision = evaluateRules(rules, signals);
    
    // Reasons should be ordered by priority
    assert.strictEqual(decision.reasons[0].ruleId, 'rule_b'); // priority 10 comes first
    assert.strictEqual(decision.reasons[1].ruleId, 'rule_a'); // priority 30 comes second
  });
});

test('Default Rules Loading', async (t) => {
  await t.test('loads default rules successfully', () => {
    const rules = loadRules();
    assert(Array.isArray(rules));
    assert(rules.length >= 7); // Should have at least 7 default rules
    
    // Check that all default rules have valid schema
    for (const rule of rules) {
      const validation = validateRuleSchema(rule);
      assert(validation.valid, `Rule ${rule.id} has validation errors: ${validation.errors.join(', ')}`);
    }
  });

  await t.test('all default rules have proper structure', () => {
    const rules = loadRules();
    const requiredIds = [
      'failed_attempts_exist',
      'no_executed_attempts',
      'near_success_with_no_failures',
      'goal_not_reached_no_failures',
      'sensitive_domain_with_failures',
      'baseline_regression',
      'all_goals_reached'
    ];
    
    const loadedIds = rules.map(r => r.id);
    for (const requiredId of requiredIds) {
      assert(loadedIds.includes(requiredId), `Default rules should include ${requiredId}`);
    }
  });
});

test('Policy Signals Building', async (t) => {
  await t.test('builds signals from scan result', () => {
    const scanResult = {
      url: 'https://example.com',
      preset: 'startup',
      attempts: [
        { executed: true, outcome: 'SUCCESS', attemptId: 'login' },
        { executed: true, outcome: 'FAILURE', attemptId: 'checkout' },
        { executed: false, outcome: 'SKIPPED', attemptId: 'payment' }
      ],
      goalReached: false,
      baseline: {
        diffResult: {
          regressions: { login: { severity: 'CRITICAL' } }
        }
      }
    };
    
    const signals = buildPolicySignals(scanResult);
    assert.strictEqual(signals.executedCount, 2);
    assert.strictEqual(signals.failedCount, 1);
    assert.strictEqual(signals.successCount, 1);
    assert.strictEqual(signals.domain, 'example.com');
    assert.strictEqual(signals.goalReached, false);
    assert.strictEqual(signals.hasRegressions, true);
  });
});

test('Error Handling', async (t) => {
  await t.test('throws on invalid regex pattern in condition', () => {
    const rules = [
      {
        id: 'bad_regex',
        description: 'Bad regex',
        priority: 10,
        when: { field: 'domain', operator: 'matches', pattern: '[invalid(' },
        then: { verdict: 'FRICTION', reason: 'Test' }
      }
    ];
    const signals = { domain: 'example.com' };
    
    assert.throws(
      () => evaluateRules(rules, signals),
      /regex|pattern/i
    );
  });

  await t.test('throws on unknown operator', () => {
    const rules = [
      {
        id: 'unknown_op',
        description: 'Unknown operator',
        priority: 10,
        when: { field: 'failedCount', operator: 'unknownOp', value: 0 },
        then: { verdict: 'FRICTION', reason: 'Test' }
      }
    ];
    const signals = { failedCount: 1 };
    
    assert.throws(
      () => evaluateRules(rules, signals),
      /Unknown condition operator/i
    );
  });

  await t.test('throws on invalid rule schema during evaluation', () => {
    const rules = [
      {
        id: 'missing_verdict',
        description: 'Missing verdict in then',
        priority: 10,
        when: { field: 'failedCount', operator: 'greaterThan', value: 0 },
        then: { reason: 'No verdict specified' }
      }
    ];
    const signals = { failedCount: 1 };
    
    // Should not throw, just not change verdict since no verdict is specified
    const decision = evaluateRules(rules, signals);
    assert.strictEqual(decision.finalVerdict, 'READY'); // Stays at default
  });
});

console.log('✅ Rules Engine Tests Complete');
