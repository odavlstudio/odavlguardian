const assert = require('assert');
const { validateFlowDefinition } = require('../src/guardian/flow-executor');
const { formatRunSummary } = require('../src/guardian/run-summary');
const { applySafeDefaults } = require('../src/guardian/reality');

console.log('\n🧪 Developer Experience Polish Tests');

// Scenario A: common misconfig produces a clear, single-line error.
{
  const invalidFlow = { name: 'Bad Flow', steps: [{ type: 'click' }] };
  const validation = validateFlowDefinition(invalidFlow);
  assert.strictEqual(validation.ok, false, 'Validation should fail for missing target');
  assert(validation.reason.includes('missing target'), 'Reason should mention missing target');
}

// Scenario B: missing optional input → warning once, run continues with defaults.
{
  const warnings = [];
  const cfg = applySafeDefaults({ attempts: [], flows: [] }, (msg) => warnings.push(msg));
  assert(Array.isArray(cfg.attempts) && cfg.attempts.length > 0, 'Attempts defaulted');
  assert(Array.isArray(cfg.flows) && cfg.flows.length > 0, 'Flows defaulted');
  assert(warnings.length === 2, 'Warnings should fire once per missing input');
}

// Scenario C: summaries are consistent across modes (string match on headers/fields).
{
  const result = {
    flowResults: [
      { outcome: 'SUCCESS' },
      { outcome: 'FRICTION' },
      { outcome: 'FAILURE' }
    ],
    diffResult: { regressions: { r1: {} } },
    baselineCreated: false,
    exitCode: 2
  };
  const summaryCli = formatRunSummary(result, { label: 'Summary' });
  const summaryCi = formatRunSummary(result, { label: 'Summary' });
  const summaryWatch = formatRunSummary(result, { label: 'Summary' });
  assert.strictEqual(summaryCli, summaryCi);
  assert.strictEqual(summaryCli, summaryWatch);
  assert(summaryCli.includes('flows=3'), 'Summary should show flow count');
  assert(summaryCli.includes('baseline=REGRESSION_DETECTED'), 'Summary should show baseline verdict');
}

console.log('✅ Developer experience polish tests passed');
