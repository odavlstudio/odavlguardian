const { buildBaselineFromJourneyResult, compareAgainstBaseline } = require('../src/guardian/drift-detector');

function makeResult({ decision='SAFE', intent='saas', goalReached=true, steps=['a','b','c'] }) {
  return {
    finalDecision: decision,
    intentDetection: { intent },
    goal: { goalReached },
    executedSteps: steps.map(id => ({ id, success: true }))
  };
}

async function run() {
  console.log('drift-detector.unit.test: start');
  const baseline = buildBaselineFromJourneyResult(makeResult({}));

  // No drift
  let cur = makeResult({});
  let cmp = compareAgainstBaseline(baseline, cur);
  if (cmp.driftDetected) throw new Error('Expected no drift');

  // Decision drift
  cur = makeResult({ decision: 'RISK' });
  cmp = compareAgainstBaseline(baseline, cur);
  if (!cmp.driftDetected || !cmp.driftReasons.some(r=>r.includes('Decision regressed'))) throw new Error('Decision drift not detected');

  // Goal drift
  cur = makeResult({ goalReached: false });
  cmp = compareAgainstBaseline(baseline, cur);
  if (!cmp.driftDetected || !cmp.driftReasons.some(r=>r.includes('Visitors can no longer reach goal'))) throw new Error('Goal drift not detected');

  // Intent drift
  cur = makeResult({ intent: 'landing' });
  cmp = compareAgainstBaseline(baseline, cur);
  if (!cmp.driftDetected || !cmp.driftReasons.some(r=>r.includes('Site intent changed'))) throw new Error('Intent drift not detected');

  // Critical step regression
  cur = {
    finalDecision: 'SAFE',
    intentDetection: { intent: 'saas' },
    goal: { goalReached: true },
    executedSteps: [{ id: 'a', success: true }] // missing 'b','c'
  };
  cmp = compareAgainstBaseline(baseline, cur);
  if (!cmp.driftDetected || !cmp.driftReasons.some(r=>r.includes('Critical step failed'))) throw new Error('Step regression not detected');

  console.log('drift-detector.unit.test: PASS');
}

run().catch(err => { console.error(err); process.exit(1); });
