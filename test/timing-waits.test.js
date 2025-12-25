const assert = require('assert');
const http = require('http');
const { chromium } = require('playwright');
const fixtureApp = require('./discovery-fixture-server');
const { GuardianFlowExecutor } = require('../src/guardian/flow-executor');

function startServer(port = 9995) {
  return new Promise((resolve) => {
    const server = http.createServer(fixtureApp);
    server.listen(port, () => resolve(server));
  });
}

describe('Signal-based waiting', () => {
  let server, browser, context, page;
  const PORT = 9995;
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

  it('handles slow submit without inflating global timeouts', async () => {
    const logs = [];
    const origLog = console.log;
    console.log = (m, ...a) => { logs.push(String(m)); origLog.call(console, m, ...a); };

    const flow = {
      id: 'slow_submit',
      name: 'Slow Submit',
      steps: [
        { type: 'navigate', target: `${BASE_URL}/wave2-2/slow-submit` },
        { type: 'submit', target: 'button[type="submit"]' },
      ],
    };

    const exec = new GuardianFlowExecutor({ baseUrl: BASE_URL, timeout: 8000 });
    const res = await exec.executeFlow(page, flow, null, BASE_URL);
    console.log = origLog;

    assert.strictEqual(res.success, true);
    assert(logs.some(l => l.includes('wait resolved by network')) || logs.some(l => l.includes('wait resolved by url-change')));
  });

  it('completes fast click quickly via DOM signal', async () => {
    const logs = [];
    const origLog = console.log;
    console.log = (m, ...a) => { logs.push(String(m)); origLog.call(console, m, ...a); };

    const flow = {
      id: 'fast_click',
      name: 'Fast Click',
      steps: [
        { type: 'navigate', target: `${BASE_URL}/wave2-2/fast-click` },
        { type: 'click', target: '#btn' },
      ],
    };

    const exec = new GuardianFlowExecutor({ baseUrl: BASE_URL, timeout: 5000 });
    const before = Date.now();
    const res = await exec.executeFlow(page, flow, null, BASE_URL);
    const elapsed = Date.now() - before;
    console.log = origLog;

    assert.strictEqual(res.success, true);
    assert(logs.some(l => l.includes('wait resolved by dom-quiet')));
    assert(elapsed < 4000); // bounded faster than legacy long waits
  });

  it('falls back to bounded timeout when no signals', async () => {
    const logs = [];
    const origLog = console.log;
    console.log = (m, ...a) => { logs.push(String(m)); origLog.call(console, m, ...a); };

    const flow = {
      id: 'no_signal',
      name: 'No Signal',
      steps: [
        { type: 'navigate', target: `${BASE_URL}/wave2-2/no-signal` },
        { type: 'click', target: '#noop' },
      ],
    };

    const exec = new GuardianFlowExecutor({ baseUrl: BASE_URL, timeout: 5000 });
    const before = Date.now();
    const res = await exec.executeFlow(page, flow, null, BASE_URL);
    const elapsed = Date.now() - before;
    console.log = origLog;

    assert.strictEqual(res.success, true);
    assert(logs.some(l => l.includes('wait resolved by timeout')));
    assert(elapsed <= 5000);
  });
});
