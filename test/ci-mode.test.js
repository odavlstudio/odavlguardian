const assert = require('assert');
const { formatCiSummary } = require('../src/guardian/ci-output');
const { computeFlowExitCode } = require('../src/guardian/reality');

process.env.CI = 'true';

(function runCiModeTests() {
  console.log('\n🧪 CI Mode Contract Tests');

  // Scenario A: All success
  const flowsSuccess = [
    { flowName: 'signup', outcome: 'SUCCESS', failureReasons: [] },
    { flowName: 'checkout', outcome: 'SUCCESS', failureReasons: [] }
  ];
  const exitA = computeFlowExitCode(flowsSuccess);
  assert.strictEqual(exitA, 0, 'Exit code should be 0 when all flows succeed');
  const summaryA = formatCiSummary({ flowResults: flowsSuccess, diffResult: {}, baselineCreated: false, exitCode: exitA, maxReasons: 2 });
  assert(summaryA.includes('CI MODE: ON'), 'CI marker should be present');
  assert(summaryA.includes('exit=0'), 'Exit code should be shown in summary');
  assert(summaryA.includes('Result: PASS'), 'Pass result should be shown');
  assert(!summaryA.includes('🧪'), 'Decorative emojis should be suppressed in CI summary');

  // Scenario B: Friction only
  const flowsFriction = [
    { flowName: 'signup', outcome: 'FRICTION', failureReasons: ['waitFor selector timeout'] },
    { flowName: 'checkout', outcome: 'SUCCESS', failureReasons: [] }
  ];
  const exitB = computeFlowExitCode(flowsFriction);
  assert.strictEqual(exitB, 1, 'Exit code should be 1 when any friction occurs');
  const summaryB = formatCiSummary({ flowResults: flowsFriction, diffResult: { regressions: { signup: {} } }, baselineCreated: false, exitCode: exitB, maxReasons: 2 });
  assert(summaryB.includes('Why CI failed'), 'Friction summary should explain failure in CI');
  assert(summaryB.includes('signup: FRICTION'), 'Flow name and friction status should be surfaced');
  assert(summaryB.includes('waitFor selector timeout'), 'Top friction reason should be included');

  // Scenario C: Failure present
  const flowsFailure = [
    { flowName: 'login', outcome: 'FAILURE', failureReasons: ['button not found'] },
    { flowName: 'checkout', outcome: 'FRICTION', failureReasons: ['response slow'] }
  ];
  const exitC = computeFlowExitCode(flowsFailure);
  assert.strictEqual(exitC, 2, 'Exit code should be 2 when any failure occurs');
  const summaryC = formatCiSummary({ flowResults: flowsFailure, diffResult: { regressions: { login: {} } }, baselineCreated: false, exitCode: exitC, maxReasons: 1 });
  assert(summaryC.includes('exit=2'), 'Exit code 2 should be shown');
  assert(summaryC.includes('login: FAILURE'), 'Failure flow should be listed');
  assert(summaryC.includes('button not found'), 'Failure reason should be printed');
  assert(summaryC.includes('… 1 more issues'), 'Bounded reasons should be indicated when truncated');

  console.log('✅ CI mode output tests passed');
})();
