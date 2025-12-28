const assert = require('assert');
const { determineCause, classifyFailureStage, analyzeFailure, buildSignature, loadSignatures, saveSignatures, recordSignature, getSignatureCount } = require('../src/guardian/failure-intelligence');

console.log('\n=== Failure Intelligence — Unit ===\n');

// Heuristics mapping tests
(function testHeuristics() {
  const ctaStep = { id: 's1', action: 'Click CTA', errorCode: 'CTA_NOT_FOUND', tags: ['cta'] };
  const cause1 = determineCause(ctaStep);
  assert.strictEqual(cause1.cause, 'Primary action not visible');

  const submitStep = { id: 's2', action: 'Submit form', errorCode: 'ELEMENT_NOT_FOUND', tags: ['submit'] };
  const cause2 = determineCause(submitStep);
  assert.strictEqual(cause2.cause, 'Form submission blocked');

  const navStep = { id: 's3', action: 'Navigate to pricing', errorCode: 'TIMEOUT', tags: ['nav'] };
  const cause3 = determineCause(navStep);
  assert.strictEqual(cause3.cause, 'Slow or blocked navigation');

  const driftStep = { id: 's4', action: 'Detect intent', errorCode: 'INTENT_DRIFT', tags: ['drift'] };
  const cause4 = determineCause(driftStep);
  assert.strictEqual(cause4.cause, 'Page no longer matches visitor intent');
})();

// Stage classification tests
(function testStage() {
  assert.strictEqual(classifyFailureStage(0, 5, 4, false), 'BEFORE_GOAL');
  assert.strictEqual(classifyFailureStage(4, 5, 4, false), 'AT_GOAL');
  assert.strictEqual(classifyFailureStage(3, 5, 4, true), 'AFTER_GOAL');
})();

// Analyze failure selection
(function testAnalyze() {
  const journey = {
    url: 'https://example.com',
    executedSteps: [
      { id: 's1', name: 'Open Page', status: 'ok' },
      { id: 's2', name: 'Click CTA', status: 'error', errorCode: 'CTA_NOT_FOUND', tags: ['cta'] },
      { id: 's3', name: 'Submit form', status: 'ok' },
    ],
    failedSteps: ['s2'],
    recipe: { steps: ['Open', 'CTA', 'Submit'] },
    goal: { goalReached: false },
  };
  const info = analyzeFailure(journey);
  assert.strictEqual(info.failureStepId, 's2');
  assert.strictEqual(info.failureStage, 'BEFORE_GOAL');
  assert.strictEqual(info.cause, 'Primary action not visible');
  assert(info.hint && info.hint.length > 5);
})();

// Signature accumulation test
(function testSignatureAccumulation() {
  // Reset store
  saveSignatures({ sites: {} });
  const info = { failureStage: 'BEFORE_GOAL', cause: 'Primary action not visible', failureStepId: 's2' };
  const site = 'https://example.com';
  const r1 = recordSignature(site, info);
  const r2 = recordSignature(site, info);
  assert.strictEqual(r1.signature, r2.signature);
  assert.strictEqual(getSignatureCount(site, info), 2);
})();

console.log('\n=== Failure Intelligence unit tests PASSED ===\n');
