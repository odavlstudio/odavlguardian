const assert = require('assert');
const http = require('http');
const { chromium } = require('playwright');
const fixtureApp = require('./discovery-fixture-server');
const { GuardianFlowExecutor } = require('../src/guardian/flow-executor');

function startServer(port = 9996) {
  return new Promise((resolve) => {
    const server = http.createServer(fixtureApp);
    server.listen(port, () => resolve(server));
  });
}

describe('Action-level retries', () => {
  let server;
  let browser;
  const PORT = 9996;
  const BASE_URL = `http://localhost:${PORT}`;

  before(async () => {
    server = await startServer(PORT);
    browser = await chromium.launch();
  });

  after(async () => {
    if (browser) await browser.close();
    if (server) await server.close();
  });

  async function withPage(fn) {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await fn(page);
    } finally {
      await page.close();
      await context.close();
    }
  }

  function captureLogs() {
    const logs = [];
    const origLog = console.log;
    console.log = (m, ...args) => {
      logs.push(String(m));
      origLog.call(console, m, ...args);
    };
    return {
      logs,
      restore: () => {
        console.log = origLog;
      },
    };
  }

  it('Scenario A: flaky click succeeds on retry and marks friction', async () => {
    await withPage(async (page) => {
      const { logs, restore } = captureLogs();
      const origClick = page.click.bind(page);
      let clickAttempts = 0;
      page.click = async (...args) => {
        clickAttempts += 1;
        if (clickAttempts === 1) {
          throw new Error('Element is not attached to the DOM');
        }
        return origClick(...args);
      };

      const flow = {
        id: 'retry_flaky_click',
        name: 'Retry Flaky Click',
        steps: [
          { type: 'navigate', target: `${BASE_URL}/wave2-2/fast-click` },
          { type: 'click', target: '#btn' },
        ],
      };

      const exec = new GuardianFlowExecutor({ baseUrl: BASE_URL, timeout: 5000 });
      const res = await exec.executeFlow(page, flow, null, BASE_URL);
      restore();

      assert.strictEqual(clickAttempts, 2);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.outcome, 'FRICTION');
      assert(logs.some((l) => l.includes('Retry 1/1 attempted for action click')));
      assert(logs.some((l) => l.includes('Retry succeeded for action click')));
      assert.strictEqual(res.stepsExecuted, 2);
    });
  });

  it('Scenario B: retryable timeout fails twice and reports failure', async () => {
    await withPage(async (page) => {
      const { logs, restore } = captureLogs();
      const origClick = page.click.bind(page);
      let clickAttempts = 0;
      page.click = async (...args) => {
        clickAttempts += 1;
        throw new Error('Timeout 1000ms exceeded while waiting');
      };

      const flow = {
        id: 'retry_timeout_failure',
        name: 'Retry Timeout Failure',
        steps: [
          { type: 'navigate', target: `${BASE_URL}/wave2-2/fast-click` },
          { type: 'click', target: '#btn' },
        ],
      };

      const exec = new GuardianFlowExecutor({ baseUrl: BASE_URL, timeout: 800 });
      const res = await exec.executeFlow(page, flow, null, BASE_URL);
      restore();

      assert.strictEqual(clickAttempts, 2);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.outcome, 'FAILURE');
      assert(logs.some((l) => l.includes('Retry 1/1 attempted for action click')));
      assert(logs.some((l) => l.includes('Retry 1/1 failed for action click')));
      assert(res.failureReasons[0].toLowerCase().includes('timeout'));
      assert.strictEqual(res.failedStep, 2);
    });
  });

  it('Scenario C: hard failure is not retried', async () => {
    await withPage(async (page) => {
      const { logs, restore } = captureLogs();
      const origClick = page.click.bind(page);
      let clickAttempts = 0;
      page.click = async (...args) => {
        clickAttempts += 1;
        throw new Error('Selector not found for required action');
      };

      const flow = {
        id: 'hard_failure_no_retry',
        name: 'Hard Failure No Retry',
        steps: [
          { type: 'navigate', target: `${BASE_URL}/wave2-2/fast-click` },
          { type: 'click', target: '#missing' },
        ],
      };

      const exec = new GuardianFlowExecutor({ baseUrl: BASE_URL, timeout: 500 });
      const res = await exec.executeFlow(page, flow, null, BASE_URL);
      restore();

      assert.strictEqual(clickAttempts, 1);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.outcome, 'FAILURE');
      assert(!logs.some((l) => l.includes('Retry 1/1 attempted for action click')));
      assert(res.failureReasons[0].toLowerCase().includes('selector'));
    });
  });
});
