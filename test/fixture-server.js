/**
 * Guardian Test Fixture Server
 * Local website for testing Guardian Attempt mode
 * Supports three modes via query parameter: ok (success), fail, friction
 * Phase 1: adds deterministic signup, login, checkout flows.
 */

const http = require('http');
const url = require('url');

const HTML_TEMPLATES = {
  home: (mode = 'ok') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Site - Home</title>
  <style>
    body { font-family: Arial; max-width: 800px; margin: 50px auto; }
    h1 { color: #333; }
    a, button { padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; margin: 10px 0; }
    a:hover, button:hover { background: #764ba2; }
    .nav { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
  </style>
</head>
<body>
  <h1>Welcome to Test Site</h1>
  <p>This is the home page. Choose a path to exercise different attempts.</p>
  <div class="nav">
    ${mode !== 'fail' ? `<a href="/about?mode=${mode}" data-guardian="about-link">About</a>` : ''}
    <a href="/contact?mode=${mode}" data-testid="contact-link" data-guardian="contact-link">Contact</a>
    <a href="/faq?mode=${mode}" data-guardian="faq-link">FAQ</a>
    <a href="/language?mode=${mode}" data-guardian="language-link">Language Switch</a>
    <a href="/signup?mode=${mode}" data-guardian="signup-link" data-testid="signup-link">Newsletter Signup</a>
    <a href="/account/signup?mode=${mode}" data-guardian="account-signup-link">Account Signup</a>
    <a href="/account/login?mode=${mode}" data-guardian="account-login-link">Login</a>
    <a href="/checkout?mode=${mode}" data-guardian="checkout-link">Checkout</a>
  </div>
  <button id="toggle-details" data-guardian="toggle-details">Show Details</button>
  <div id="details-content" style="display:none; margin-top:10px; padding:10px; background:#f0f0f0;">
    <p>This is additional content revealed by the toggle button.</p>
  </div>
  <script>
    document.getElementById('toggle-details').addEventListener('click', function() {
      var content = document.getElementById('details-content');
      if (content.style.display === 'none') {
        content.style.display = 'block';
        this.textContent = 'Hide Details';
      } else {
        content.style.display = 'none';
        this.textContent = 'Show Details';
      }
    });
  </script>
</body>
</html>
  `,

  about: (mode = 'ok') => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>About</title></head>
<body>
  <h1 data-guardian="about-heading">About Us</h1>
  <p>We are a test site for Guardian phase 2 auto-attempts.</p>
  <a href="/?mode=${mode}" data-guardian="home-link">Back to Home</a>
</body>
</html>
  `,

  faq: (mode = 'ok') => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>FAQ</title></head>
<body>
  <h1 data-guardian="faq-heading">Frequently Asked Questions</h1>
  <p>Q: Is this a real site? A: No, it's a test fixture.</p>
  <a href="/?mode=${mode}" data-guardian="home-link">Back to Home</a>
</body>
</html>
  `,

  language: (mode = 'ok') => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Language Switch</title>
  <style>
    body { font-family: Arial; max-width: 600px; margin: 50px auto; }
    h1 { color: #333; }
    button { padding: 10px 16px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px; }
    button:hover { background: #764ba2; }
    .menu { margin-top: 15px; display: none; }
    .menu.show { display: block; }
    .current { font-weight: bold; margin-top: 20px; }
    .delayed { opacity: 0.6; }
  </style>
</head>
<body>
  <h1>Language Switch</h1>
  <button data-guardian="lang-toggle" id="lang-toggle">Language</button>
  <div class="menu" id="lang-menu">
    <button data-guardian="lang-option-de" data-testid="lang-option-de" id="lang-option-de">DE</button>
    <button data-guardian="lang-option-en" id="lang-option-en">EN</button>
  </div>
  <div class="current" data-guardian="lang-current" id="lang-current">EN</div>

  <script>
    const toggle = document.getElementById('lang-toggle');
    const menu = document.getElementById('lang-menu');
    const langCurrent = document.getElementById('lang-current');
    const optionDe = document.getElementById('lang-option-de');
    const optionEn = document.getElementById('lang-option-en');

    toggle.addEventListener('click', () => {
      menu.classList.add('show');
    });

    function switchLang(target) {
      const delay = '${mode}' === 'friction' ? 2000 : 100;
      const shouldFail = '${mode}' === 'fail';
      if (shouldFail) return;
      setTimeout(() => {
        langCurrent.textContent = target;
      }, delay);
    }

    optionDe.addEventListener('click', () => switchLang('DE'));
    optionEn.addEventListener('click', () => switchLang('EN'));
  </script>
</body>
</html>
    `;
  },

  contact: (mode = 'ok') => {
    const isDisabled = mode === 'fail' ? ' disabled' : '';
    const onSubmit = mode === 'fail' ? ' onclick="return false;"' : '';
    const delayClass = mode === 'friction' ? ' class="delayed"' : '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact Form</title>
  <style>
    body { font-family: Arial; max-width: 600px; margin: 50px auto; }
    h1 { color: #333; }
    form { border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
    input, textarea { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 3px; font-family: Arial; }
    button { padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; }
    button:hover { background: #764ba2; }
    button:disabled { background: #ccc; cursor: not-allowed; }
    .delayed { animation: fadeIn 1.5s; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .success { color: green; font-weight: bold; display: none; }
    .success.show { display: block; }
  </style>
</head>
<body>
  <h1>Contact Form</h1>
  <form id="contactForm"${onSubmit}>
    <input type="text" name="name" data-testid="name" placeholder="Your Name" required />
    <input type="email" name="email" data-testid="email" placeholder="Your Email" required />
    <textarea name="message" data-testid="message" placeholder="Your Message" required></textarea>
    <button type="submit"${isDisabled} data-testid="submit-btn">Submit</button>
  </form>
  <div id="success" class="success" data-guardian="success">✅ Form submitted successfully!</div>

  <script>
    const form = document.getElementById('contactForm');
    const successDiv = document.getElementById('success');
    
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Simulate processing
      await new Promise(r => setTimeout(r, ${mode === 'friction' ? '1000' : '100'}));
      
      successDiv.classList.add('show');
      
      // Simulate navigation for 'ok' mode after 500ms
      if ('${mode}' === 'ok') {
        await new Promise(r => setTimeout(r, 500));
        window.location.href = '/contact/success';
      }
    });
  </script>
</body>
</html>
    `;
  },

  signup: (mode = 'ok') => {
    const isDisabled = mode === 'fail' ? ' disabled' : '';
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter Signup</title>
  <style>
    body { font-family: Arial; max-width: 600px; margin: 50px auto; }
    h1 { color: #333; }
    form { border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
    input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 3px; font-family: Arial; }
    button { padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; }
    button:hover { background: #764ba2; }
    button:disabled { background: #ccc; cursor: not-allowed; }
    .success { color: green; font-weight: bold; display: none; margin-top: 10px; }
    .success.show { display: block; }
  </style>
</head>
<body>
  <h1>Newsletter Signup</h1>
  <form id="signupForm">
    <input type="email" name="email" data-guardian="signup-email" data-testid="signup-email" placeholder="Your Email" required />
    <button type="submit" data-guardian="signup-submit" ${isDisabled}>Subscribe</button>
  </form>
  <div id="signupSuccess" class="success" data-guardian="signup-success">🎉 Signed up successfully!</div>

  <script>
    const form = document.getElementById('signupForm');
    const successDiv = document.getElementById('signupSuccess');
    const mode = '${mode}';

    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      if (mode === 'fail') {
        return; // no-op
      }

      const delay = mode === 'friction' ? 2000 : 200;
      await new Promise(r => setTimeout(r, delay));

      successDiv.classList.add('show');
      if (mode === 'ok') {
        await new Promise(r => setTimeout(r, 300));
        window.location.href = '/signup/success';
      }
    });
  </script>
</body>
</html>
    `;
  },

    accountSignup: (mode = 'ok') => {
      const isFail = mode === 'fail';
      const isFriction = mode === 'friction';
      const delay = isFriction ? 2000 : 100;
      return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Signup</title>
    <style>
      body { font-family: Arial; max-width: 600px; margin: 40px auto; }
      form { border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
      input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 3px; }
      button { padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; }
      button:disabled { background: #ccc; cursor: not-allowed; }
      .success { color: green; font-weight: bold; display: none; margin-top: 10px; }
      .error { color: red; font-weight: bold; display: none; margin-top: 10px; }
    </style>
  </head>
  <body>
    <h1>Create Account</h1>
    <form id="account-signup">
      <input type="email" data-guardian="signup-email" placeholder="Email" required />
      <input type="password" data-guardian="signup-password" placeholder="Password" required />
      <button type="submit" data-guardian="signup-account-submit">Sign up</button>
    </form>
    <div id="signup-success" class="success" data-guardian="signup-account-success">🎉 Account created!</div>
    <div id="signup-error" class="error" data-guardian="signup-account-error">Signup failed. Please try again.</div>

    <script>
      const form = document.getElementById('account-signup');
      const successEl = document.getElementById('signup-success');
      const errorEl = document.getElementById('signup-error');
      const mode = '${mode}';

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        successEl.classList.remove('show');
        errorEl.classList.remove('show');

        if (mode === 'fail') {
          errorEl.classList.add('show');
          return;
        }

        await new Promise(r => setTimeout(r, ${delay}));
        successEl.classList.add('show');
        if (mode === 'ok') {
          setTimeout(() => { window.location.href = '/account/signup/success'; }, 200);
        }
      });
    </script>
  </body>
  </html>
      `;
    },

    accountSignupSuccess: () => `
  <!DOCTYPE html>
  <html lang="en">
  <head><meta charset="UTF-8"><title>Signup Success</title></head>
  <body>
    <h1 data-guardian="signup-account-success">Account Created</h1>
    <p>Welcome aboard.</p>
  </body>
  </html>
    `,

    login: (mode = 'ok', isLoggedIn = false, userEmail = '') => {
      const isFriction = mode === 'friction';
      const delay = isFriction ? 2000 : 100;
      return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login</title>
    <style>
      body { font-family: Arial; max-width: 600px; margin: 40px auto; }
      form { border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
      input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 3px; }
      button { padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; }
      .success { color: green; font-weight: bold; display: ${isLoggedIn ? 'block' : 'none'}; margin-top: 10px; }
      .error { color: red; font-weight: bold; display: none; margin-top: 10px; }
    </style>
  </head>
  <body>
    <h1>Login</h1>
    <form id="account-login">
      <input type="email" data-guardian="login-email" placeholder="Email" value="${userEmail || 'user@example.com'}" required />
      <input type="password" data-guardian="login-password" placeholder="Password" value="password123" required />
      <button type="submit" data-guardian="login-submit">Login</button>
    </form>
    <div id="login-success" class="success" data-guardian="login-success">✅ Logged in</div>
    <div id="login-error" class="error" data-guardian="login-error">Invalid credentials</div>

    <script>
      const form = document.getElementById('account-login');
      const successEl = document.getElementById('login-success');
      const errorEl = document.getElementById('login-error');
      const mode = '${mode}';

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        successEl.style.display = 'none';
        errorEl.style.display = 'none';

        if (mode === 'fail') {
          errorEl.style.display = 'block';
          return;
        }

        await new Promise(r => setTimeout(r, ${delay}));
        successEl.style.display = 'block';
        document.cookie = 'guardian_session=valid; path=/';
        if (mode === 'ok') {
          setTimeout(() => { window.location.href = '/account/login/success'; }, 200);
        }
      });
    </script>
  </body>
  </html>
      `;
    },

    loginSuccess: () => `
  <!DOCTYPE html>
  <html lang="en">
  <head><meta charset="UTF-8"><title>Login Success</title></head>
  <body>
    <h1 data-guardian="login-success">Welcome back</h1>
    <p>You are logged in.</p>
  </body>
  </html>
    `,

    checkout: (mode = 'ok') => {
      const isFail = mode === 'fail';
      const isFriction = mode === 'friction';
      const delay = isFriction ? 2500 : 150;
      return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Checkout</title>
    <style>
      body { font-family: Arial; max-width: 700px; margin: 40px auto; }
      .summary { border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
      .total { font-weight: bold; font-size: 18px; }
      button { padding: 12px 20px; background: #2c7be5; color: white; border: none; border-radius: 5px; cursor: pointer; }
      button:disabled { background: #ccc; cursor: not-allowed; }
      .success { color: green; font-weight: bold; display: none; margin-top: 15px; }
      .error { color: red; font-weight: bold; display: none; margin-top: 15px; }
    </style>
  </head>
  <body>
    <h1>Checkout</h1>
    <div class="summary">
      <p>Item: Test Product</p>
      <p class="total">Total: $42.00</p>
    </div>
    <button data-guardian="checkout-place-order" id="place-order">Place order</button>
    <div id="checkout-success" class="success" data-guardian="checkout-success">✅ Order placed!</div>
    <div id="checkout-error" class="error" data-guardian="checkout-error">Order failed. Please try again.</div>

    <script>
      const btn = document.getElementById('place-order');
      const successEl = document.getElementById('checkout-success');
      const errorEl = document.getElementById('checkout-error');
      const mode = '${mode}';

      btn.addEventListener('click', async () => {
        successEl.style.display = 'none';
        errorEl.style.display = 'none';

        if (mode === 'fail') {
          errorEl.style.display = 'block';
          return;
        }

        await new Promise(r => setTimeout(r, ${delay}));
        successEl.style.display = 'block';
        if (mode === 'ok') {
          setTimeout(() => { window.location.href = '/checkout/confirmation'; }, 150);
        }
      });
    </script>
  </body>
  </html>
      `;
    },

    checkoutSuccess: () => `
  <!DOCTYPE html>
  <html lang="en">
  <head><meta charset="UTF-8"><title>Order Confirmed</title></head>
  <body>
    <h1 data-guardian="checkout-success">Order Confirmed</h1>
    <p>Your order was placed.</p>
  </body>
  </html>
    `

    ,
    // Universal attempt fixtures
    universalSmoke: () => `
  <!DOCTYPE html>
  <html lang="en">
  <head><meta charset="UTF-8"><title>Universal Smoke</title></head>
  <body>
    <header>
      <nav>
        <a href="/docs">Docs</a>
        <a href="/pricing">Pricing</a>
        <a href="/contact">Contact</a>
      </nav>
    </header>
    <main>
      <h1>Universal Smoke Fixture</h1>
      <p>Contains internal links for smoke navigation.</p>
    </main>
    <footer>
      <a href="/terms">Terms</a>
    </footer>
  </body>
  </html>
    `,

    universalCta: () => `
  <!DOCTYPE html>
  <html lang="en">
  <head><meta charset="UTF-8"><title>Universal CTA</title></head>
  <body>
    <header>
      <a href="https://github.com/odavlstudio" target="_blank">GitHub</a>
      <a href="/docs">Docs</a>
    </header>
    <main>
      <button>Get started</button>
      <a href="/demo">Try Demo</a>
    </main>
  </body>
  </html>
    `,

    universalMailto: () => `
  <!DOCTYPE html>
  <html lang="en">
  <head><meta charset="UTF-8"><title>Universal Contact</title></head>
  <body>
    <h1>Contact Us</h1>
    <p>Reach us anytime.</p>
    <a href="mailto:hello@example.com">Email us</a>
  </body>
  </html>
    `
  };

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header
    .split(';')
    .map(c => c.trim())
    .filter(Boolean)
    .reduce((acc, item) => {
      const [k, v] = item.split('=');
      if (k) acc[k] = v || '';
      return acc;
    }, {});
}

function startFixtureServer(port = 0) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url, true);
      const pathname = parsedUrl.pathname;
      const mode = parsedUrl.query.mode || 'ok';
      const cookies = parseCookies(req);
      const isLoggedIn = cookies['guardian_session'] === 'valid';

      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'text/html');

      // Route handling
      if (pathname === '/' || pathname === '') {
        res.writeHead(200);
        res.end(HTML_TEMPLATES.home(mode));
      } else if (pathname === '/about') {
        res.writeHead(200);
        res.end(HTML_TEMPLATES.about(mode));
      } else if (pathname === '/faq') {
        res.writeHead(200);
        res.end(HTML_TEMPLATES.faq(mode));
      } else if (pathname === '/contact') {
        res.writeHead(200);
        res.end(HTML_TEMPLATES.contact(mode));
      } else if (pathname === '/contact/success') {
        res.writeHead(200);
        res.end(HTML_TEMPLATES.success());
      } else if (pathname === '/language') {
        res.writeHead(200);
        res.end(HTML_TEMPLATES.language(mode));
      } else if (pathname === '/signup') {
        res.writeHead(200);
        res.end(HTML_TEMPLATES.signup(mode));
      } else if (pathname === '/signup/success') {
        res.writeHead(200);
        res.end(HTML_TEMPLATES.success());
      } else if (pathname === '/account/signup') {
        res.writeHead(200);
        res.end(HTML_TEMPLATES.accountSignup(mode));
      } else if (pathname === '/account/signup/success') {
        res.writeHead(200);
        res.end(HTML_TEMPLATES.accountSignupSuccess());
      } else if (pathname === '/account/login') {
        res.writeHead(200);
        res.end(HTML_TEMPLATES.login(mode, isLoggedIn, parsedUrl.query.email || ''));
      } else if (pathname === '/account/login/success') {
        res.writeHead(200);
        res.end(HTML_TEMPLATES.loginSuccess());
      } else if (pathname === '/checkout') {
        res.writeHead(200);
        res.end(HTML_TEMPLATES.checkout(mode));
      } else if (pathname === '/checkout/confirmation') {
        res.writeHead(200);
        res.end(HTML_TEMPLATES.checkoutSuccess());
      } else if (pathname === '/docs') {
        res.writeHead(200);
        res.end('<html><body><h1>Docs</h1></body></html>');
      } else if (pathname === '/pricing') {
        res.writeHead(200);
        res.end('<html><body><h1>Pricing</h1></body></html>');
      } else if (pathname === '/terms') {
        res.writeHead(200);
        res.end('<html><body><h1>Terms</h1></body></html>');
      } else if (pathname === '/demo') {
        res.writeHead(200);
        res.end('<html><body><h1>Demo</h1></body></html>');
      } else if (pathname === '/universal/smoke') {
        res.writeHead(200);
        res.end(HTML_TEMPLATES.universalSmoke());
      } else if (pathname === '/universal/cta') {
        res.writeHead(200);
        res.end(HTML_TEMPLATES.universalCta());
      } else if (pathname === '/universal/mailto') {
        res.writeHead(200);
        res.end(HTML_TEMPLATES.universalMailto());
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    server.listen(port, '127.0.0.1', () => {
      const actualPort = server.address().port;
      resolve({
        server,
        port: actualPort,
        baseUrl: `http://127.0.0.1:${actualPort}`,
        close: () => {
          return new Promise((resolveClose) => {
            server.close(resolveClose);
          });
        }
      });
    });
  });
}

module.exports = { startFixtureServer, HTML_TEMPLATES };
