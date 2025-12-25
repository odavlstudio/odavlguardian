const http = require('http');
const assert = require('assert');
const { spawnSync } = require('child_process');

function startSlowServer(delayMs) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      setTimeout(() => {
        res.setHeader('Content-Type', 'text/html');
        res.writeHead(200);
        res.end(`
          <html><body>
            <a href="/login" data-guardian="account-login-link">Login</a>
            <div data-guardian="login-success">ok</div>
          </body></html>
        `);
      }, delayMs);
    });

    server.listen(0, '0.0.0.0', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

(async () => {
  console.log('🧪 Smoke Time Budget');
  const { server, port } = await startSlowServer(4000);
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const result = spawnSync(process.execPath, ['bin/guardian.js', 'smoke', baseUrl], {
      encoding: 'utf8',
      timeout: 20000,
      env: { ...process.env, CI: '1', GUARDIAN_SMOKE_BUDGET_MS: '1000' }
    });

    console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);

    assert.strictEqual(result.status, 2, 'Smoke should fail when budget exceeded');
    assert.ok(result.stdout.includes('time budget exceeded'));
  } finally {
    server.close();
  }
})();
