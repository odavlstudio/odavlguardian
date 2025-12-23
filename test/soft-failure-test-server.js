/**
 * Soft Failure Test Server
 * Provides controlled test scenarios for validator testing
 */

const express = require('express');
const path = require('path');

function createSoftFailureTestServer() {
  const app = express();
  app.use(express.json());

  // Route: Contact form with optional error state
  app.get('/contact', (req, res) => {
    const hasError = req.query.error === 'true';
    res.send(`<!DOCTYPE html>
<html>
<head><title>Contact Form</title></head>
<body>
  <h1>Contact Us</h1>
  <form id="contact-form">
    <input type="text" name="name" data-testid="name" placeholder="Name" required />
    <input type="email" name="email" data-testid="email" placeholder="Email" required />
    <textarea name="message" data-testid="message" placeholder="Message" required></textarea>
    <button type="submit">Submit</button>
  </form>
  <div id="result"></div>
  <script>
    document.getElementById('contact-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const resultDiv = document.getElementById('result');
      ${hasError ? `
      resultDiv.innerHTML = '<div class="error" role="alert">Error submitting form</div>';
      ` : `
      resultDiv.innerHTML = '<div data-testid="success" data-guardian="success" class="success">Thank you! Form submitted successfully.</div>';
      `}
    });
  </script>
</body>
</html>`);
  });

  // Route: Language switcher - working version
  app.get('/language', (req, res) => {
    const lang = req.query.lang || 'en';
    res.send(`<!DOCTYPE html>
<html lang="${lang}">
<head><title>Language Switcher</title></head>
<body>
  <h1>Language Switcher</h1>
  <div>
    <button id="lang-toggle" data-guardian="lang-toggle">Change Language</button>
    <select id="lang-select">
      <option value="en">English</option>
      <option value="de">Deutsch</option>
      <option value="fr">Français</option>
    </select>
  </div>
  <div data-guardian="lang-current" data-testid="lang-current">${lang.toUpperCase()}</div>
  <div id="page-content">
    ${lang === 'de' ? 'Willkommen' : lang === 'fr' ? 'Bienvenue' : 'Welcome'}
  </div>
  <script>
    document.getElementById('lang-select').addEventListener('change', (e) => {
      const newLang = e.target.value;
      window.location.href = '/language?lang=' + newLang;
    });
  </script>
</body>
</html>`);
  });

  // Route: Newsletter signup - working version
  app.get('/newsletter', (req, res) => {
    const success = req.query.success === 'true';
    res.send(`<!DOCTYPE html>
<html>
<head><title>Newsletter Signup</title></head>
<body>
  <h1>Subscribe to our Newsletter</h1>
  <form id="signup-form">
    <input type="email" name="email" data-testid="signup-email" data-guardian="signup-email" placeholder="Email" required />
    <button type="submit">Subscribe</button>
  </form>
  <div id="result"></div>
  <script>
    document.getElementById('signup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const resultDiv = document.getElementById('result');
      ${success ? `
      resultDiv.innerHTML = '<div data-testid="signup-success" data-guardian="signup-success" class="toast-success">Thank you for subscribing! Check your email for confirmation.</div>';
      document.getElementById('signup-form').style.display = 'none';
      ` : `
      resultDiv.innerHTML = '<div data-testid="signup-success" data-guardian="signup-success" class="toast-success">Subscription confirmed! Welcome to our newsletter.</div>';
      document.getElementById('signup-form').style.display = 'none';
      `}
    });
  </script>
</body>
</html>`);
  });

  // Soft failure test: Language switcher that doesn't actually switch
  app.get('/language-no-switch', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head><title>Language Switcher (Broken)</title></head>
<body>
  <h1>Language Switcher</h1>
  <div>
    <button id="lang-toggle" data-guardian="lang-toggle">Change Language</button>
    <select id="lang-select">
      <option value="en">English</option>
      <option value="de">Deutsch</option>
    </select>
  </div>
  <div data-guardian="lang-current" data-testid="lang-current">EN</div>
  <script>
    // BUG: Click handler doesn't actually change language
    document.getElementById('lang-select').addEventListener('change', (e) => {
      // Intentionally do nothing - soft failure!
      console.log('Selected:', e.target.value);
    });
  </script>
</body>
</html>`);
  });

  // Soft failure test: Form that submits but shows error
  app.get('/contact-silent-fail', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head><title>Contact Form</title></head>
<body>
  <h1>Contact Us</h1>
  <form id="contact-form">
    <input type="text" name="name" data-testid="name" placeholder="Name" required />
    <input type="email" name="email" data-testid="email" placeholder="Email" required />
    <textarea name="message" data-testid="message" placeholder="Message" required></textarea>
    <button type="submit">Submit</button>
  </form>
  <div id="result"></div>
  <script>
    document.getElementById('contact-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const resultDiv = document.getElementById('result');
      // Soft failure: Form submits without success or error indicator
      // User doesn't know if it worked!
      resultDiv.innerHTML = '';
    });
  </script>
</body>
</html>`);
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}

module.exports = { createSoftFailureTestServer };
