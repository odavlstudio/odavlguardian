const http = require('http');
const assert = require('assert');
const { executeSmoke } = require('../src/guardian/smoke');

function startSmokeServer(htmlOverrides = {}) {
  return new Promise((resolve) => {
    let count = 0;
    const server = http.createServer((req, res) => {
      count += 1;
      if (process.env.GUARDIAN_SMOKE_DEBUG) {
        console.log(`REQ ${count}: ${req.url}`);
      }
      res.setHeader('Content-Type', 'text/html');
      if (req.url === '/login') {
        res.writeHead(200);
        res.end(htmlOverrides.login || `
          <html><body>
            <a href="/">Home</a>
            <form>
              <input data-guardian="login-email" />
              <input data-guardian="login-password" />
              <button type="button" data-guardian="login-submit">Login</button>
            </form>
            <div data-guardian="login-success">Logged in</div>
          </body></html>
        `);
        return;
      }
      if (req.url === '/signup') {
        res.writeHead(200);
        res.end(htmlOverrides.signup || `
          <html><body>
            <form>
              <input data-guardian="signup-email" />
              <input data-guardian="signup-password" />
              <button type="button" data-guardian="signup-account-submit">Sign up</button>
            </form>
            <div data-guardian="signup-account-success">Welcome</div>
          </body></html>
        `);
        return;
      }
      if (req.url === '/contact') {
        res.writeHead(200);
        res.end(htmlOverrides.contact || `
          <html><body>
            <form>
              <input name="name" />
              <input name="email" />
              <textarea name="message"></textarea>
              <button type="button">Send</button>
            </form>
            <div data-guardian="success">Contact ready</div>
          </body></html>
        `);
        return;
      }
      res.writeHead(200);
      res.end(htmlOverrides.home || `
        <html><body>
          <a href="/contact" data-guardian="contact-link">Contact</a>
          <a href="/login" data-guardian="account-login-link">Login</a>
          <a href="/signup" data-guardian="account-signup-link">Signup</a>
          <nav><a href="/contact">Go</a></nav>
        </body></html>
      `);
    });

    server.listen(0, '0.0.0.0', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

(async () => {
  console.log('🧪 Smoke Basic');
  const { server, port } = await startSmokeServer();
  const baseUrl = `http://127.0.0.1:${port}`;

  // Sanity check server reachability
  await new Promise((resolve, reject) => {
    http.get(baseUrl, (res) => {
      res.resume();
      try {
        assert.strictEqual(res.statusCode, 200);
        resolve();
      } catch (err) {
        reject(err);
      }
    }).on('error', reject);
  });

  try {
    const result = await executeSmoke({ baseUrl, headful: false });
    console.log(result);

    // Basic smoke should not hard fail; friction acceptable
    assert.ok(result.exitCode === 0 || result.exitCode === 1, 'Smoke should pass or friction');
    const attemptIds = result.attemptResults.map(a => a.attemptId).sort();
    assert.deepStrictEqual(attemptIds, ['contact_form', 'login', 'signup', 'universal_reality']);
    assert.ok(!attemptIds.includes('checkout'));
    assert.ok(!attemptIds.includes('newsletter_signup'));
  } finally {
    server.close();
  }
})();
