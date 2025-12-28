const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function startServer() {
  let mode = 'ok';
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    if (mode === 'ok') {
      return res.end(`<!DOCTYPE html><html><body>
        <a href="/contact">Contact</a>
        <form><input name="name" /><textarea name="message"></textarea></form>
      </body></html>`);
    } else {
      return res.end(`<!DOCTYPE html><html><body>
        <a href="/contact">Contact</a>
        <!-- Form removed to break goal -->
      </body></html>`);
    }
  });
  server.setMode = (m) => { mode = m; };
  return new Promise(resolve => server.listen(0, () => resolve(server)));
}

async function run() {
  console.log('live.integration.test: start');
  const server = await startServer();
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  const outDir = path.join(require('os').tmpdir(), `guardian-live-${Date.now()}`);
  fs.mkdirSync(outDir, { recursive: true });

  // First run (baseline capture)
  let res = spawnSync('node', ['bin/guardian.js', 'live', base, '--out', outDir], { encoding: 'utf-8' });
  if (res.status !== 0) { console.error(res.stdout); console.error(res.stderr); throw new Error('Baseline capture failed'); }
  const baselinePath = path.join(outDir, 'baseline.json');
  if (!fs.existsSync(baselinePath)) throw new Error('Baseline not created');

  // Break goal and run live again
  server.setMode('broken');
  res = spawnSync('node', ['bin/guardian.js', 'live', base, '--out', outDir], { encoding: 'utf-8' });
  if (res.status !== 3) { console.error(res.stdout); console.error(res.stderr); throw new Error('Expected exit code 3 for drift'); }

  const report = JSON.parse(fs.readFileSync(path.join(outDir, 'report.json'), 'utf-8'));
  if (!report.drift || !report.drift.driftDetected) throw new Error('Drift not detected in report');

  console.log('live.integration.test: PASS');
  server.close();
}

run().catch(err => { console.error(err); process.exit(1); });
