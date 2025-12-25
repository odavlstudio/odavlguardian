const assert = require('assert');
const http = require('http');
const { chromium } = require('playwright');
const fixtureApp = require('./discovery-fixture-server');
const { GuardianFlowExecutor } = require('../src/guardian/flow-executor');
const { computeFlowExitCode } = require('../src/guardian/reality');

function startServer(port = 9996) {
  return new Promise((resolve) => {
    const server = http.createServer(fixtureApp);
    server.listen(port, () => resolve(server));
  });
}

describe('Flow resilience and exit codes', () => {
  let server, browser, context, page;
  const PORT = 9996;
  const BASE_URL = `http://localhost:${PORT}`;

  before(async () => {
    server = await startServer(PORT);
    browser = await chromium.launch();
    context = await browser.newContext();
    page = await context.newPage();
  });

  after(async () => {
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
    if (server) await server.close();
  });

  it('continues to next flow when first flow hard-fails', async () => {
    const exec = new GuardianFlowExecutor({ baseUrl: BASE_URL });

    // Flow 1: hard failure (missing selector)
    const flowFail = {
      id: 'fail_flow',
      name: 'Hard Fail Flow',
      steps: [
        { type: 'navigate', target: `${BASE_URL}/wave1-3/success-no-confirm` },
        { type: 'click', target: '#missing-button' },
        { type: 'submit', target: 'button[type="submit"]' },
      ],
    };

    // Flow 2: succeeds
    const flowSuccess = {
      id: 'success_flow',
      name: 'Success Flow',
      steps: [
        { type: 'navigate', target: `${BASE_URL}/wave1-3/success-no-confirm` },
        { type: 'type', target: 'input[name="email"]', value: 'user@example.com' },
        { type: 'type', target: 'textarea[name="message"]', value: 'hello' },
        { type: 'submit', target: 'button[type="submit"]' },
      ],
    };

    const res1 = await exec.executeFlow(page, flowFail, null, BASE_URL);
    const res2 = await exec.executeFlow(page, flowSuccess, null, BASE_URL);

    assert.strictEqual(res1.outcome, 'FAILURE');
    assert.strictEqual(res2.outcome, 'SUCCESS');
  });

  it('marks flow as friction on soft failure and continues', async () => {
    const exec = new GuardianFlowExecutor({ baseUrl: BASE_URL });

    const flowFriction = {
      id: 'friction_flow',
      name: 'Friction Flow',
      steps: [
        { type: 'navigate', target: `${BASE_URL}/wave1-3/success-no-confirm` },
        { type: 'waitFor', target: '#non-critical', timeout: 300 }, // soft failure
        { type: 'wait', duration: 200 },
      ],
    };

    const res = await exec.executeFlow(page, flowFriction, null, BASE_URL);
    assert.strictEqual(res.outcome, 'FRICTION');
    assert(res.success === true);
  });

  it('computes exit code aggregation (0/1/2)', () => {
    const success = [{ outcome: 'SUCCESS' }];
    const friction = [{ outcome: 'FRICTION' }];
    const failure = [{ outcome: 'FAILURE' }];

    assert.strictEqual(computeFlowExitCode(success), 0);
    assert.strictEqual(computeFlowExitCode(friction), 1);
    assert.strictEqual(computeFlowExitCode(failure), 2);
    assert.strictEqual(computeFlowExitCode([...success, ...friction]), 1);
    assert.strictEqual(computeFlowExitCode([...success, ...failure]), 2);
  });
});
