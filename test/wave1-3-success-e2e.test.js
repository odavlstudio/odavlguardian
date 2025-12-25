const assert = require('assert');
const http = require('http');
const { chromium } = require('playwright');
const fixtureApp = require('./discovery-fixture-server');
const { GuardianFlowExecutor } = require('../src/guardian/flow-executor');

function startServer(port = 9997) {
  return new Promise((resolve) => {
    const server = http.createServer(fixtureApp);
    server.listen(port, () => resolve(server));
  });
}

describe('Wave 1.3 — Success Evaluation (E2E)', () => {
  let server, browser, context, page;
  const PORT = 9997;
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

  it('SUCCESS without confirmation text (200 + form clears)', async () => {
    const logs = [];
    const origLog = console.log;
    console.log = (msg, ...args) => { logs.push(String(msg)); origLog.call(console, msg, ...args); };
    const flow = {
      id: 'wave1_3_case1',
      name: 'Submit Without Confirmation Text',
      steps: [
        { type: 'navigate', target: `${BASE_URL}/wave1-3/success-no-confirm` },
        { type: 'type', target: 'input[name="email"]', value: 'user@example.com' },
        { type: 'type', target: 'textarea[name="message"]', value: 'hello' },
        { type: 'submit', target: 'button[type="submit"]' },
      ],
    };
    const exec = new GuardianFlowExecutor({ baseUrl: BASE_URL });
    const res = await exec.executeFlow(page, flow, null, BASE_URL);
    console.log = origLog;
    assert.strictEqual(res.successEval.status, 'success');
    assert.strictEqual(res.success, true);
    // Assert reasons surfaced in CLI output
    assert(logs.some(l => l.includes('Reasons:')));
    assert(logs.some(l => l.includes('Network submit succeeded')));
  });

  it('SUCCESS with redirect (302 → /thanks)', async () => {
    const flow = {
      id: 'wave1_3_case2',
      name: 'Submit With Redirect',
      steps: [
        { type: 'navigate', target: `${BASE_URL}/wave1-3/redirect-submit` },
        { type: 'submit', target: 'button[type="submit"]' },
      ],
    };
    const exec = new GuardianFlowExecutor({ baseUrl: BASE_URL });
    const res = await exec.executeFlow(page, flow, null, BASE_URL);
    assert.strictEqual(res.successEval.status, 'success');
    assert.strictEqual(res.success, true);
  });

  it('FAILURE with validation error markers', async () => {
    const flow = {
      id: 'wave1_3_case3',
      name: 'Submit Validation Error',
      steps: [
        { type: 'navigate', target: `${BASE_URL}/wave1-3/error-validation` },
        { type: 'type', target: 'input[name="email"]', value: 'bad' },
        { type: 'submit', target: 'button[type="submit"]' },
      ],
    };
    const exec = new GuardianFlowExecutor({ baseUrl: BASE_URL });
    const res = await exec.executeFlow(page, flow, null, BASE_URL);
    assert.strictEqual(res.successEval.status, 'failure');
    assert.strictEqual(res.success, false);
  });

  it('FRICTION: network 200 but console error after submit', async () => {
    const logs = [];
    const origLog = console.log;
    console.log = (msg, ...args) => { logs.push(String(msg)); origLog.call(console, msg, ...args); };
    const flow = {
      id: 'wave1_3_case4',
      name: 'Submit With Console Error',
      steps: [
        { type: 'navigate', target: `${BASE_URL}/wave1-3/friction-console` },
        { type: 'submit', target: 'button[type="submit"]' },
      ],
    };
    const exec = new GuardianFlowExecutor({ baseUrl: BASE_URL });
    const res = await exec.executeFlow(page, flow, null, BASE_URL);
    console.log = origLog;
    assert.strictEqual(res.successEval.status, 'friction');
    assert.strictEqual(res.success, false);
    // Assert friction reasons appear in output
    assert(logs.some(l => l.includes('Reasons:')));
    assert(logs.some(l => l.includes('Console errors after submit')));
  });
});
