const http = require('http');
const assert = require('assert');
const { spawnSync } = require('child_process');

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'text/html');
      if (req.url === '/login') {
        res.writeHead(200);
        res.end(`
          <html><body>
            <input data-guardian="login-email" />
            <input data-guardian="login-password" />
            <button type="button" data-guardian="login-submit">Login</button>
            <div data-guardian="login-success">ok</div>
          </body></html>
        `);
        return;
      }
      res.writeHead(200);
      res.end(`
        <html><body>
          <a href="/login" data-guardian="account-login-link">Login</a>
          <div data-guardian="success">ok</div>
        </body></html>
      `);
    });

    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }));
  });
}

(async () => {
  console.log('🧪 Smoke CI Output');
  const { server, port } = await startServer();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const result = spawnSync(process.execPath, ['bin/guardian.js', 'smoke', baseUrl], {
      encoding: 'utf8',
      timeout: 30000,
      env: { ...process.env, CI: '1' }
    });

    console.log(result.stdout);
    assert.strictEqual(result.status, 0);
    assert.ok(result.stdout.includes('SMOKE MODE: ON'));
    assert.ok(result.stdout.includes('Summary:'));
    assert.ok(!result.stdout.includes('Baseline'));
    assert.ok(!result.stdout.toLowerCase().includes('crawl'));
  } finally {
    server.close();
  }
})();
