const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function startServer() {
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/saas')) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(`<!DOCTYPE html><html><head><title>SAAS</title></head><body>
        <a href="/pricing">Pricing</a>
        <a href="/signup">Create account</a>
        <button>Sign up</button>
        <div>Subscribe monthly plan</div>
      </body></html>`);
    }
    if (req.url.startsWith('/shop')) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(`<!DOCTYPE html><html><head><title>SHOP</title></head><body>
        <a href="/shop">Shop</a>
        <a href="/cart">Cart</a>
        <button>Buy</button>
      </body></html>`);
    }
    if (req.url.startsWith('/landing')) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(`<!DOCTYPE html><html><head><title>LANDING</title></head><body>
        <a href="#">Learn more</a>
        <button>Get started</button>
      </body></html>`);
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Home</h1>');
  });
  return new Promise(resolve => server.listen(0, () => resolve(server)));
}

async function run() {
  console.log('phase2-intent.integration.test: start');
  const server = await startServer();
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  const tmpDir = path.join(require('os').tmpdir(), `guardian-phase2-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  // SAAS: auto journey selection should pick saas
  let res = spawnSync('node', ['bin/guardian.js', 'journey-scan', `${base}/saas`, '--out', tmpDir], { encoding: 'utf-8' });
  if (res.status !== 0 && res.status !== 1) { console.error('STDOUT:\n', res.stdout); console.error('STDERR:\n', res.stderr); throw new Error('CLI failed for SAAS'); }
  const reportPath1 = path.join(tmpDir, 'report.json');
  if (!fs.existsSync(reportPath1)) { console.error('SAAS: report.json missing. STDOUT:\n', res.stdout); console.error('STDERR:\n', res.stderr); throw new Error('SAAS report missing'); }
  let report = JSON.parse(fs.readFileSync(reportPath1, 'utf-8'));
  if (report.intentDetection.intent !== 'saas') throw new Error('SAAS intent not detected');
  if (!String(report.metadata.journey).toLowerCase().includes('saas')) throw new Error('SAAS journey not selected');

  // SHOP: ensure when goal not reached (no cart/checkout), decision becomes RISK even if steps succeed
  const tmpDir2 = path.join(require('os').tmpdir(), `guardian-phase2-${Date.now()}-2`);
  fs.mkdirSync(tmpDir2, { recursive: true });
  res = spawnSync('node', ['bin/guardian.js', 'journey-scan', `${base}/shop`, '--out', tmpDir2], { encoding: 'utf-8' });
  if (res.status !== 1 && res.status !== 0) { console.error('STDOUT:\n', res.stdout); console.error('STDERR:\n', res.stderr); throw new Error('CLI failed for SHOP'); }
  const reportPath2 = path.join(tmpDir2, 'report.json');
  if (!fs.existsSync(reportPath2)) { console.error('SHOP: report.json missing. STDOUT:\n', res.stdout); console.error('STDERR:\n', res.stderr); throw new Error('SHOP report missing'); }
  report = JSON.parse(fs.readFileSync(reportPath2, 'utf-8'));
  if (report.intentDetection.intent !== 'shop') throw new Error('SHOP intent not detected');
  if (!String(report.metadata.journey).toLowerCase().includes('shop')) throw new Error('SHOP journey not selected');
  if (report.goal.goalReached) throw new Error('Goal should not be reached for SHOP minimal page');
  if (report.decision !== 'RISK') throw new Error('Decision should be RISK when goal not reached with no failures');

  // LANDING: should default to landing when unknown or landing-like
  const tmpDir3 = path.join(require('os').tmpdir(), `guardian-phase2-${Date.now()}-3`);
  fs.mkdirSync(tmpDir3, { recursive: true });
  res = spawnSync('node', ['bin/guardian.js', 'journey-scan', `${base}/landing`, '--out', tmpDir3], { encoding: 'utf-8' });
  if (res.status !== 0 && res.status !== 1) { console.error('STDOUT:\n', res.stdout); console.error('STDERR:\n', res.stderr); throw new Error('CLI failed for LANDING'); }
  const reportPath3 = path.join(tmpDir3, 'report.json');
  if (!fs.existsSync(reportPath3)) { console.error('LANDING: report.json missing. STDOUT:\n', res.stdout); console.error('STDERR:\n', res.stderr); throw new Error('LANDING report missing'); }
  report = JSON.parse(fs.readFileSync(reportPath3, 'utf-8'));
  if (report.intentDetection.intent !== 'landing') throw new Error('LANDING intent not detected');
  if (!String(report.metadata.journey).toLowerCase().includes('landing')) throw new Error('LANDING journey not selected');

  console.log('phase2-intent.integration.test: PASS');
  server.close();
}

run().catch(err => { console.error(err); process.exit(1); });
