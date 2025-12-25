const assert = require('assert');
const { evaluateSuccess } = require('../src/guardian/success-evaluator');

describe('Wave 1.3 — Success Evaluator (Unit)', () => {
  it('SUCCESS high: network 200 + url change + form cleared; no negatives', () => {
    const before = { url: 'http://localhost/x', state: { formExists: true, inputsFilledCount: 2, alertTextLength: 0, liveRegionTextLength: 0, ariaInvalidCount: 0 } };
    const after = { url: 'http://localhost/y', state: { formExists: true, inputsFilledCount: 0, alertTextLength: 0, liveRegionTextLength: 1, ariaInvalidCount: 0 } };
    const events = {
      baseOrigin: 'http://localhost',
      navChanged: true,
      requests: [{ method: () => 'POST', url: () => 'http://localhost/api' }],
      responses: [{ status: () => 200, request: () => ({ method: () => 'POST', url: () => 'http://localhost/api' }) }],
      consoleErrors: [],
    };
    const r = evaluateSuccess(before, after, events);
    assert.strictEqual(r.status, 'success');
    assert.strictEqual(r.confidence, 'high');
  });

  it('FRICTION: network 200 + console error', () => {
    const before = { url: 'http://localhost/a', state: { formExists: true, inputsFilledCount: 1, alertTextLength: 0, liveRegionTextLength: 0, ariaInvalidCount: 0 } };
    const after = { url: 'http://localhost/a', state: { formExists: true, inputsFilledCount: 0, alertTextLength: 0, liveRegionTextLength: 0, ariaInvalidCount: 0 } };
    const events = {
      baseOrigin: 'http://localhost',
      navChanged: false,
      requests: [{ method: () => 'POST', url: () => 'http://localhost/api' }],
      responses: [{ status: () => 200, request: () => ({ method: () => 'POST', url: () => 'http://localhost/api' }) }],
      consoleErrors: [{ type: 'error', text: 'bad' }],
    };
    const r = evaluateSuccess(before, after, events);
    assert.strictEqual(r.status, 'friction');
  });

  it('FAILURE: no positives + aria-invalid increase', () => {
    const before = { url: 'http://localhost/a', state: { formExists: true, inputsFilledCount: 0, alertTextLength: 0, liveRegionTextLength: 0, ariaInvalidCount: 0 } };
    const after = { url: 'http://localhost/a', state: { formExists: true, inputsFilledCount: 0, alertTextLength: 10, liveRegionTextLength: 0, ariaInvalidCount: 1 } };
    const events = { baseOrigin: 'http://localhost', navChanged: false, requests: [], responses: [], consoleErrors: [] };
    const r = evaluateSuccess(before, after, events);
    assert.strictEqual(r.status, 'failure');
  });
});
