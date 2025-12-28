const assert = require('assert');
const { analyzeFailure, recordSignature, getSignatureCount } = require('../src/guardian/failure-intelligence');

console.log('\n=== Failure Intelligence — Integration ===\n');

(function testBlockedCTAFlow() {
  const journey = {
    url: 'https://shop.example.com',
    executedSteps: [
      { id: 'p1', name: 'Open product', status: 'ok' },
      { id: 'c1', name: 'Add to cart', status: 'ok' },
      { id: 'cta', name: 'Begin checkout', status: 'error', errorCode: 'CTA_NOT_FOUND', tags: ['cta'] },
    ],
    failedSteps: ['cta'],
    recipe: { steps: ['Open product', 'Add to cart', 'Begin checkout'] },
    goal: { goalReached: false },
  };

  const info = analyzeFailure(journey);
  assert.strictEqual(info.failureStepId, 'cta');
  assert.strictEqual(info.cause, 'Primary action not visible');
  assert.strictEqual(info.failureStage, 'BEFORE_GOAL');

  const rec = recordSignature(journey.url, info);
  const count = getSignatureCount(journey.url, info);
  assert.strictEqual(rec.count, count);
  assert(count >= 1);
})();

console.log('\n=== Failure Intelligence integration tests PASSED ===\n');
