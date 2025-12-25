const assert = require('assert');
const http = require('http');
const { chromium } = require('playwright');
const fixtureApp = require('./discovery-fixture-server');
const { detectByLayers, LAYER } = require('../src/guardian/detection-layers');

function startServer(port) {
  return new Promise((resolve) => {
    const server = http.createServer(fixtureApp);
    server.listen(port, () => resolve(server));
  });
}

describe('Profile-based selector overrides', () => {
  let browser;
  let serverA;
  let serverB;
  let serverC;

  before(async () => {
    browser = await chromium.launch();
    serverA = await startServer(9997);
    serverB = await startServer(9998);
    serverC = await startServer(9999);
  });

  after(async () => {
    if (browser) await browser.close();
    if (serverA) await serverA.close();
    if (serverB) await serverB.close();
    if (serverC) await serverC.close();
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
    const orig = console.log;
    console.log = (m, ...args) => {
      logs.push(String(m));
      orig.call(console, m, ...args);
    };
    return () => { console.log = orig; return logs; };
  }

  it('Scenario A: profile override wins when heuristics would miss', async () => {
    await withPage(async (page) => {
      const restore = captureLogs();
      const baseUrl = 'http://localhost:9997/profile-site';
      await page.goto(baseUrl);
      const res = await detectByLayers(page, 'contact', baseUrl);
      const logs = restore();

      assert.strictEqual(res.found, true);
      assert.strictEqual(res.layer, LAYER.PROFILE);
      assert.strictEqual(res.primaryCandidate.selector, '#profile-contact');
      assert(res.reason.includes('profile override'));
      assert(logs.some(l => l.includes('Loaded profile for http://localhost:9997')));
      assert(logs.some(l => l.includes('Using profile selector for contact')));
    });
  });

  it('Scenario B: invalid profile selector is a hard failure', async () => {
    await withPage(async (page) => {
      const restore = captureLogs();
      const baseUrl = 'http://localhost:9998/profile-invalid';
      await page.goto(baseUrl);
      const res = await detectByLayers(page, 'contact', baseUrl);
      const logs = restore();

      assert.strictEqual(res.found, false);
      assert.strictEqual(res.layer, LAYER.PROFILE);
      assert.strictEqual(res.hardFailure, true);
      assert(res.reason.toLowerCase().includes('profile selector'));
      assert(logs.some(l => l.includes('Profile selector for contact not found')));
    });
  });

  it('Scenario C: no profile falls back to heuristics', async () => {
    await withPage(async (page) => {
      const restore = captureLogs();
      const baseUrl = 'http://localhost:9999/profile-heuristic';
      await page.goto(baseUrl);
      const res = await detectByLayers(page, 'contact', baseUrl);
      const logs = restore();

      assert.strictEqual(res.found, true);
      assert.notStrictEqual(res.layer, LAYER.PROFILE);
      assert(res.layer === LAYER.DATA_GUARDIAN || res.layer === LAYER.HREF || res.layer === LAYER.TEXT || res.layer === LAYER.STRUCTURE);
      assert(!logs.some(l => l.includes('Loaded profile for http://localhost:9999')));
    });
  });
});
