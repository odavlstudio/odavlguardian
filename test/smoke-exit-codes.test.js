const http = require('http');
const assert = require('assert');
const { spawnSync } = require('child_process');

function startServer(variant) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const slow = variant === 'friction' ? 3500 : 0;
      setTimeout(() => {
        res.setHeader('Content-Type', 'text/html');
        if (req.url === '/login') {
          const successBlock = variant === 'failure' ? '' : '<div data-guardian="login-success">ok</div>';
          res.writeHead(200);
          res.end(`
            <html><body>
              <input data-guardian="login-email" />
              <input data-guardian="login-password" />
              <button type="button" data-guardian="login-submit">Login</button>
              ${successBlock}
            </body></html>
          `);
          return;
        }
        res.writeHead(200);
        res.end(`
          <html><body>
            <a href="/login" data-guardian="account-login-link">Login</a>
            <nav><a href="/login">Nav</a></nav>
            <div data-guardian="signup-account-success">ok</div>
            <div data-guardian="success">ok</div>
          </body></html>
        `);
      }, slow);
    });

    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }));
  });
}

function runSmoke(url) {
  return spawnSync(process.execPath, ['bin/guardian.js', 'smoke', url], {
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, CI: '1' }
  });
}

(async () => {
  console.log('🧪 Smoke Exit Codes');

  // PASS
  const passServer = await startServer('pass');
  const passUrl = `http://127.0.0.1:${passServer.port}`;
  const passRes = runSmoke(passUrl);
  console.log(passRes.stdout);
  assert.strictEqual(passRes.status, 0, 'PASS should return 0');
  passServer.server.close();

  // FRICTION
  const frictionServer = await startServer('friction');
  const frictionUrl = `http://127.0.0.1:${frictionServer.port}`;
  const frictionRes = runSmoke(frictionUrl);
  console.log(frictionRes.stdout);
  assert.strictEqual(frictionRes.status, 1, 'Friction should return 1');
  frictionServer.server.close();

  // FAILURE
  const failServer = await startServer('failure');
  const failUrl = `http://127.0.0.1:${failServer.port}`;
  const failRes = runSmoke(failUrl);
  console.log(failRes.stdout);
  assert.strictEqual(failRes.status, 2, 'Failure should return 2');
  failServer.server.close();
})();
