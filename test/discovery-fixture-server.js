/**
 * Discovery Engine Test Fixture Server
 * 
 * Serves multiple pages with safe and risky interactions for testing.
 * - Safe buttons and links
 * - Risky buttons (logout, delete)
 * - Safe forms (newsletter, contact)
 * - Risky forms (payment, account deletion)
 */

const express = require('express');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true }));

let interactionLog = [];

// ============================================================================
// HOME PAGE
// ============================================================================

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Discovery Test Site - Home</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .button-group { margin: 20px 0; }
        button { padding: 10px 20px; margin: 5px; cursor: pointer; }
        a { display: inline-block; margin: 5px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
        .risky { background-color: #dc3545; }
        .safe { background-color: #28a745; }
        .warning { background-color: #ffc107; }
        form { border: 1px solid #ccc; padding: 15px; margin: 15px 0; }
        input { display: block; margin: 10px 0; padding: 8px; }
        label { display: block; margin-top: 10px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🏠 Discovery Test Site</h1>
        <p>This site contains safe and risky interactions for testing the discovery engine.</p>

        <div class="button-group">
          <h2>Safe Navigation Links</h2>
          <a href="/products" class="safe">→ Products Page</a>
          <a href="/pricing" class="safe">→ Pricing Page</a>
          <a href="/about" class="safe">→ About Page</a>
        </div>

        <div class="button-group">
          <h2>Safe Interactive Buttons</h2>
          <button class="safe" onclick="alert('✓ Safe button clicked!')">Click Me (Safe)</button>
          <button class="safe" onclick="location.href='/confirmation'">Safe Navigation Button</button>
        </div>

        <div class="button-group">
          <h2>⚠️ Risky Buttons (Should NOT be clicked)</h2>
          <button class="risky" onclick="alert('🚨 Logout clicked!')">Logout</button>
          <button class="risky" onclick="alert('🚨 Delete account!')">Delete Account</button>
          <button class="risky" onclick="alert('🚨 Remove all data!')">Remove My Data</button>
          <button class="risky" onclick="alert('🚨 Unsubscribe')">Unsubscribe from emails</button>
        </div>

        <div class="button-group">
          <h2>Safe Forms</h2>
          <form id="newsletter" action="/newsletter" method="POST" data-guardian-safe="true">
            <label>Newsletter Signup (Safe - marked with data-guardian-safe)</label>
            <input type="email" name="email" placeholder="your@email.com" required>
            <input type="text" name="name" placeholder="Your name">
            <button type="submit" class="safe">Subscribe to Newsletter</button>
          </form>

          <form id="contact" action="/contact" method="POST" data-guardian-safe="true">
            <label>Contact Form (Safe - marked with data-guardian-safe)</label>
            <input type="email" name="email" placeholder="your@email.com" required>
            <input type="text" name="subject" placeholder="Subject">
            <textarea name="message" placeholder="Your message" style="display:block; margin: 10px 0; width: 100%; height: 100px;"></textarea>
            <button type="submit" class="safe">Send Message</button>
          </form>
        </div>

        <div class="button-group">
          <h2>🚨 Risky Forms (Should NOT be filled)</h2>
          <form id="payment" action="/checkout" method="POST">
            <label>Payment Form (Risky - no guardian-safe flag)</label>
            <input type="text" name="card" placeholder="Card number" required>
            <input type="text" name="cvv" placeholder="CVV" required>
            <button type="submit" class="risky">Process Payment</button>
          </form>

          <form id="delete-account" action="/account/delete" method="POST">
            <label>Delete Account Form (Risky)</label>
            <input type="password" name="password" placeholder="Confirm password" required>
            <button type="submit" class="risky">Permanently Delete Account</button>
          </form>
        </div>

        <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
          <strong>Test Expectations:</strong><br>
          ✓ Safe links and buttons should be discovered and safe to execute<br>
          ✗ Risky buttons/links should be marked as risky and NOT executed<br>
          ✓ Safe forms (newsletter, contact) should be filled<br>
          ✗ Risky forms (payment, delete) should NOT be filled<br>
        </p>
      </div>
    </body>
    </html>
  `);
});

// ============================================================================
// PRODUCT PAGES
// ============================================================================

app.get('/products', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Products Page</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        a { display: inline-block; margin: 5px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
        .back { background-color: #6c757d; }
        .product { border: 1px solid #ddd; padding: 15px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📦 Products</h1>
        <a href="/" class="back">← Back to Home</a>
        
        <div class="product">
          <h2>Product 1</h2>
          <p>High-quality item</p>
          <button onclick="alert('✓ Product added to cart!')">Add to Cart</button>
        </div>

        <div class="product">
          <h2>Product 2</h2>
          <p>Premium option</p>
          <button onclick="alert('✓ Product added to cart!')">Add to Cart</button>
        </div>

        <a href="/pricing">View Pricing →</a>
      </div>
    </body>
    </html>
  `);
});

// ============================================================================
// PRICING PAGE (with risky checkout link)
// ============================================================================

app.get('/pricing', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Pricing Page</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        a { display: inline-block; margin: 5px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
        .back { background-color: #6c757d; }
        .risky { background-color: #dc3545; }
        .pricing-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .pricing-table th, .pricing-table td { border: 1px solid #ddd; padding: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>💰 Pricing</h1>
        <a href="/" class="back">← Back to Home</a>

        <table class="pricing-table">
          <tr>
            <th>Plan</th>
            <th>Price</th>
            <th>Features</th>
          </tr>
          <tr>
            <td>Basic</td>
            <td>$9/mo</td>
            <td>Core features</td>
          </tr>
          <tr>
            <td>Pro</td>
            <td>$29/mo</td>
            <td>All features + support</td>
          </tr>
          <tr>
            <td>Enterprise</td>
            <td>Custom</td>
            <td>Everything + custom</td>
          </tr>
        </table>

        <p>⚠️ Below is a risky checkout link that should NOT be discovered and executed:</p>
        <a href="/checkout" class="risky">🚨 CHECKOUT (Risky - DO NOT CLICK)</a>

        <p style="margin-top: 30px;">
          <strong>Discovery Test:</strong> This link contains "/checkout" in href, so it should be marked as risky.
        </p>
      </div>
    </body>
    </html>
  `);
});

// ============================================================================
// ABOUT PAGE
// ============================================================================

app.get('/about', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>About Page</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        a { display: inline-block; margin: 5px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
        .back { background-color: #6c757d; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>ℹ️ About Us</h1>
        <a href="/" class="back">← Back to Home</a>
        <p>We are a test company for discovery engine validation.</p>
      </div>
    </body>
    </html>
  `);
});

// ============================================================================
// CONFIRMATION PAGE
// ============================================================================

app.get('/confirmation', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Confirmation Page</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; text-align: center; }
        .container { max-width: 800px; margin: 0 auto; }
        a { display: inline-block; margin: 5px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
        .back { background-color: #6c757d; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>✅ Action Confirmed</h1>
        <p>The action was completed successfully.</p>
        <a href="/" class="back">← Back to Home</a>
      </div>
    </body>
    </html>
  `);
});

// ============================================================================
// FORM HANDLERS (no-op, just log and respond)
// ============================================================================

app.post('/newsletter', (req, res) => {
  interactionLog.push({ action: 'newsletter', data: req.body, timestamp: new Date() });
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Newsletter - Thank You</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; text-align: center; }
        .container { max-width: 800px; margin: 0 auto; }
        a { display: inline-block; margin: 5px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📧 Thank You!</h1>
        <p>You've been successfully subscribed to our newsletter.</p>
        <a href="/">← Back to Home</a>
      </div>
    </body>
    </html>
  `);
});

app.post('/contact', (req, res) => {
  interactionLog.push({ action: 'contact', data: req.body, timestamp: new Date() });
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Contact - Message Sent</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; text-align: center; }
        .container { max-width: 800px; margin: 0 auto; }
        a { display: inline-block; margin: 5px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>✅ Message Sent</h1>
        <p>Thank you for contacting us. We'll get back to you soon!</p>
        <a href="/">← Back to Home</a>
      </div>
    </body>
    </html>
  `);
});

// Risky endpoints (should not be called by safe explorer)
app.post('/checkout', (req, res) => {
  interactionLog.push({ action: 'checkout', data: req.body, timestamp: new Date(), RISKY: true });
  res.status(403).send('❌ Risky action blocked');
});

app.post('/account/delete', (req, res) => {
  interactionLog.push({ action: 'delete-account', data: req.body, timestamp: new Date(), RISKY: true });
  res.status(403).send('❌ Risky action blocked');
});

// ============================================================================
// GERMAN PAGES (for multilingual testing)
// ============================================================================

app.get('/de', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <title>Startseite - Testseite</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        nav { margin: 20px 0; padding: 10px; background: #f0f0f0; }
        a { display: inline-block; margin: 5px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
        footer { margin-top: 40px; padding: 20px; background: #f0f0f0; text-align: center; }
        .safe { background-color: #28a745; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🇩🇪 Deutsche Testseite</h1>
        <p>Dies ist eine deutschsprachige Testseite für die semantische Kontakterkennung.</p>
        
        <nav>
          <h2>Navigation</h2>
          <a href="/de/uber" class="safe">→ Über uns</a>
          <a href="/de/kontakt" class="safe">→ Kontakt</a>
          <a href="/de/datenschutz" class="safe">→ Datenschutz</a>
        </nav>

        <section>
          <h2>Kontaktformular auf der Startseite</h2>
          <form action="/de/kontakt" method="POST">
            <label>Name:</label>
            <input type="text" name="name" placeholder="Ihr Name" required>
            <label>E-Mail:</label>
            <input type="email" name="email" placeholder="ihre@email.de" required>
            <label>Nachricht:</label>
            <textarea name="message" placeholder="Ihre Nachricht" style="width: 100%; height: 100px;"></textarea>
            <button type="submit" class="safe">Nachricht senden</button>
          </form>
        </section>

        <footer>
          <p>Kontaktieren Sie uns gerne über <a href="/de/kontakt">unser Kontaktformular</a> oder per <a href="mailto:kontakt@example.de">E-Mail</a>.</p>
        </footer>
      </div>
    </body>
    </html>
  `);
});

app.get('/de/kontakt', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <title>Kontakt - Testseite</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        a { display: inline-block; margin: 5px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
        form { border: 1px solid #ccc; padding: 20px; margin: 20px 0; }
        input, textarea { display: block; margin: 10px 0; width: 100%; padding: 8px; }
        button { background-color: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📧 Kontakt</h1>
        <a href="/de">← Zurück zur Startseite</a>
        
        <p>Bitte füllen Sie das Kontaktformular aus und wir werden uns in Kürze bei Ihnen melden.</p>
        
        <form action="/de/kontakt" method="POST">
          <label>Name:</label>
          <input type="text" name="name" placeholder="Ihr Name" required>
          <label>E-Mail:</label>
          <input type="email" name="email" placeholder="ihre@email.de" required>
          <label>Betreff:</label>
          <input type="text" name="subject" placeholder="Betreff Ihrer Nachricht" required>
          <label>Nachricht:</label>
          <textarea name="message" placeholder="Ihre Nachricht" required></textarea>
          <button type="submit">Nachricht senden</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

app.post('/de/kontakt', (req, res) => {
  interactionLog.push({ action: 'kontakt', data: req.body, timestamp: new Date() });
  res.send(`
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <title>Nachricht versendet</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; text-align: center; }
        .container { max-width: 800px; margin: 0 auto; }
        a { display: inline-block; margin: 5px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
        [data-guardian="success"] { background: #d4edda; padding: 20px; border-radius: 4px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>✅ Nachricht versendet</h1>
        <div data-guardian="success">
          <p>Vielen Dank für Ihre Nachricht. Wir kümmern uns in Kürze darum!</p>
        </div>
        <a href="/de">← Zurück zur Startseite</a>
      </div>
    </body>
    </html>
  `);
});

app.get('/de/uber', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <title>Über uns</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        a { display: inline-block; margin: 5px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>ℹ️ Über uns</h1>
        <a href="/de">← Zurück zur Startseite</a>
        <p>Wir sind ein Testunternehmen für die Validierung der semantischen Spracherkennung.</p>
      </div>
    </body>
    </html>
  `);
});

// Test endpoint for getting interaction log
app.get('/test/log', (req, res) => {
  res.json({ log: interactionLog });
});

app.get('/test/clear-log', (req, res) => {
  interactionLog = [];
  res.json({ cleared: true });
});

// ============================================================================
// WAVE 1.2 - DATA-GUARDIAN ATTRIBUTE FIXTURES
// ============================================================================

// Page with ONLY heuristics (no data-guardian attribute)
app.get('/wave1-2/heuristics-only', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Heuristics Only - Contact Detection Test</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        nav { margin: 20px 0; padding: 10px; background: #f0f0f0; }
        a { display: inline-block; margin: 5px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
        form { border: 1px solid #ccc; padding: 15px; margin: 15px 0; }
        input, textarea, button { display: block; margin: 10px 0; padding: 8px; width: 100%; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Heuristics Only Test Page</h1>
        <p>This page has NO data-guardian attributes. Detection must rely on heuristics (text/href matching).</p>
        
        <nav>
          <h2>Navigation (nav element - heuristic position)</h2>
          <a href="/contact">Reach Out</a>
          <a href="/about">About Us</a>
        </nav>

        <section>
          <h2>Contact Us Form</h2>
          <form action="/contact-submit" method="POST">
            <input type="text" placeholder="Your name" name="name">
            <textarea placeholder="Your message" name="message"></textarea>
            <button type="submit">Send Message</button>
          </form>
        </section>
      </div>
    </body>
    </html>
  `);
});

// Page with data-guardian attributes (guaranteed stability)
app.get('/wave1-2/with-data-guardian', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Data Guardian Attributes - Contact Detection Test</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        nav { margin: 20px 0; padding: 10px; background: #f0f0f0; }
        a { display: inline-block; margin: 5px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
        form { border: 1px solid #ccc; padding: 15px; margin: 15px 0; }
        input, textarea, button { display: block; margin: 10px 0; padding: 8px; width: 100%; }
        .stable { background-color: #d4edda; padding: 10px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Data Guardian Attributes Test Page</h1>
        <p>This page uses data-guardian attributes for guaranteed stability.</p>
        
        <div class="stable">
          <strong>✅ This page has data-guardian attributes:</strong>
          <ul>
            <li data-guardian="contact">Contact link in navigation</li>
            <li data-guardian="form">Contact form with data-guardian="form"</li>
            <li data-guardian="submit">Submit button with data-guardian="submit"</li>
          </ul>
        </div>

        <nav>
          <h2>Navigation</h2>
          <a href="/contact-us" data-guardian="contact">Get in Touch</a>
          <a href="/about" data-guardian="about">Learn More</a>
        </nav>

        <section>
          <h2>Contact Us</h2>
          <form action="/submit-contact" method="POST" data-guardian="form">
            <input type="text" placeholder="Your name" name="name" required>
            <textarea placeholder="Your message" name="message" required></textarea>
            <button type="submit" data-guardian="submit">Send Inquiry</button>
          </form>
        </section>
      </div>
    </body>
    </html>
  `);
});

// Page with misleading text but data-guardian overrides
app.get('/wave1-2/misleading-text', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Misleading Text Override - Contact Detection Test</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .misleading { color: red; font-style: italic; }
        a { display: inline-block; margin: 5px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
        .stable { background-color: #d4edda; padding: 10px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Misleading Text Override Test</h1>
        <p>This page has confusing text, but data-guardian attributes clarify the true purpose.</p>
        
        <div class="stable">
          <strong>✅ This link says "Help Desk" but data-guardian="contact"</strong>
        </div>

        <section>
          <h2>Main Content</h2>
          <p>Welcome to our site. This link with misleading text is marked as contact:</p>
          <a href="/support" data-guardian="contact" class="misleading">Help Desk Support Portal</a>
          
          <p>Compare with unmarked link (heuristic detection will fail):</p>
          <a href="/support" class="misleading">Help Desk Support Portal (no marker)</a>
        </section>
      </div>
    </body>
    </html>
  `);
});

// Page with tokenized data-guardian values
app.get('/wave1-2/tokenized-guardian', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Tokenized Data Guardian - Contact Detection Test</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        a { display: inline-block; margin: 5px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
        .stable { background-color: #d4edda; padding: 10px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Tokenized Data Guardian Test</h1>
        <p>This page uses tokenized data-guardian values like "contact primary".</p>
        
        <div class="stable">
          <strong>✅ Links with tokenized data-guardian values:</strong>
          <ul>
            <li>data-guardian="contact primary" (contains "contact" token)</li>
            <li>data-guardian="form-main" (variant attribute style)</li>
          </ul>
        </div>

        <section>
          <h2>Navigation</h2>
          <a href="/contact-us" data-guardian="contact primary">Contact Page</a>
          <a href="/contact-secondary" data-guardian="contact secondary">Alternative Contact</a>
          <a href="/form" data-guardian-role="form">Main Form</a>
        </section>
      </div>
    </body>
    </html>
  `);
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 9999;

module.exports = app;

// Only start if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🧪 Discovery Test Fixture Server running on http://localhost:${PORT}`);
    console.log(`\nTest Pages:`);
    console.log(`  Home:      http://localhost:${PORT}/`);
    console.log(`  Products:  http://localhost:${PORT}/products`);
    console.log(`  Pricing:   http://localhost:${PORT}/pricing`);
    console.log(`  About:     http://localhost:${PORT}/about`);
    console.log(`\nTest Endpoints:`);
    console.log(`  Log:       http://localhost:${PORT}/test/log`);
    console.log(`  Clear:     http://localhost:${PORT}/test/clear-log`);
  });
}

// ============================================================================
// WAVE 1.3 - SUCCESS EVALUATION FIXTURES
// ============================================================================

// Case 1: Success with NO confirmation message (200 + form clears)
app.get('/wave1-3/success-no-confirm', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Wave 1.3 - Success No Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        form { border: 1px solid #ccc; padding: 15px; margin: 15px 0; }
        input, textarea, button { display: block; margin: 10px 0; padding: 8px; width: 100%; }
        [aria-live] { margin-top: 10px; color: #0a0; }
      </style>
      <script>
        function onSubmit(ev) {
          ev.preventDefault();
          const form = ev.target;
          // Simulate network submit
          fetch('/wave1-3/api/submit', { method: 'POST', body: new FormData(form) })
            .then(r => {
              if (r.ok) {
                // Clear inputs, update live region, but do not show explicit confirmation text
                Array.from(form.querySelectorAll('input, textarea')).forEach(el => el.value = '');
                const live = document.querySelector('#live');
                if (live) live.textContent = '✓ Completed';
              }
            });
        }
      </script>
    </head>
    <body>
      <h1>Wave 1.3 — Success Without Confirmation Text</h1>
      <form onsubmit="onSubmit(event)">
        <input type="email" name="email" placeholder="your@email.com" required>
        <textarea name="message" placeholder="Your message"></textarea>
        <button type="submit">Submit</button>
        <div id="live" aria-live="polite"></div>
      </form>
    </body>
    </html>
  `);
});

app.post('/wave1-3/api/submit', (req, res) => {
  // Success 200 without redirect
  res.status(200).json({ ok: true });
});

// Case 2: Success with redirect (302 → /thanks)
app.get('/wave1-3/redirect-submit', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Wave 1.3 - Redirect Success</title>
      <script>
        function onSubmit(ev) {
          ev.preventDefault();
          fetch('/wave1-3/api/redirect', { method: 'POST' }).then(() => {
            location.href = '/wave1-3/thanks';
          });
        }
      </script>
    </head>
    <body>
      <h1>Wave 1.3 — Redirect Success</h1>
      <form onsubmit="onSubmit(event)">
        <input name="x" value="1">
        <button type="submit">Go</button>
      </form>
    </body>
    </html>
  `);
});

app.post('/wave1-3/api/redirect', (req, res) => {
  res.status(302).set('Location', '/wave1-3/thanks').send('');
});

app.get('/wave1-3/thanks', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Thanks</title></head>
    <body>
      <div role="status">Minimal thanks page</div>
    </body>
    </html>
  `);
});

// Case 3: Failure with visible error (aria-invalid increase, role=alert)
app.get('/wave1-3/error-validation', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Wave 1.3 - Error Validation</title>
      <script>
        function onSubmit(ev) {
          ev.preventDefault();
          const form = ev.target;
          fetch('/wave1-3/api/error', { method: 'POST' }).then(r => r.text()).then(() => {
            const email = form.querySelector('input[name="email"]');
            if (email) email.setAttribute('aria-invalid', 'true');
            const alert = document.querySelector('#alert');
            if (alert) alert.textContent = 'Error: invalid email';
          });
        }
      </script>
    </head>
    <body>
      <h1>Wave 1.3 — Failure with Validation Error</h1>
      <div id="alert" role="alert"></div>
      <form onsubmit="onSubmit(event)">
        <input type="email" name="email" placeholder="email">
        <button type="submit">Send</button>
      </form>
    </body>
    </html>
  `);
});

app.post('/wave1-3/api/error', (req, res) => {
  res.status(400).send('Bad Request');
});

// Case 4: Friction — network 200 but console error after submit
app.get('/wave1-3/friction-console', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Wave 1.3 - Friction Console Error</title>
      <script>
        function onSubmit(ev) {
          ev.preventDefault();
          const form = ev.target;
          fetch('/wave1-3/api/submit', { method: 'POST', body: new FormData(form) })
            .then(r => r.json())
            .then(() => {
              console.error('Synthetic error after submit');
            });
        }
      </script>
    </head>
    <body>
      <h1>Wave 1.3 — Friction</h1>
      <form onsubmit="onSubmit(event)">
        <input name="q" value="abc">
        <button type="submit">Submit</button>
      </form>
    </body>
    </html>
  `);
});

// ============================================================================
// WAVE 2.2 - Timing & Waiting Fixtures
// ============================================================================

// Slow submit: network resolves after delay
app.get('/wave2-2/slow-submit', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Slow Submit</title>
      <script>
        function onSubmit(ev) {
          ev.preventDefault();
          fetch('/wave2-2/api/slow', { method: 'POST', body: new FormData(ev.target) })
            .then(r => r.json())
            .then(() => {
              const live = document.querySelector('#live');
              if (live) live.textContent = 'done';
            });
        }
      </script>
    </head>
    <body>
      <form onsubmit="onSubmit(event)">
        <input name="q" value="1" />
        <button type="submit">Go</button>
        <div id="live" aria-live="polite"></div>
      </form>
    </body>
    </html>
  `);
});

app.post('/wave2-2/api/slow', async (req, res) => {
  await new Promise(r => setTimeout(r, 1200));
  res.json({ ok: true });
});

// Fast click: instant DOM update
app.get('/wave2-2/fast-click', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Fast Click</title>
      <script>
        function onClick() {
          document.querySelector('#status').textContent = 'updated';
        }
      </script>
    </head>
    <body>
      <button id="btn" onclick="onClick()">Do</button>
      <div id="status" aria-live="polite"></div>
    </body>
    </html>
  `);
});

// No-signal click: nothing happens
app.get('/wave2-2/no-signal', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>No Signal</title></head>
    <body>
      <button id="noop">No-op</button>
    </body>
    </html>
  `);
});

// Profile override fixtures (Phase 3.1)
app.get('/profile-site', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Profile Driven Site</title></head>
    <body>
      <nav class="profile-nav">
        <a id="profile-contact" href="/support">Reach our team</a>
      </nav>
      <form id="profile-form">
        <input name="email" />
        <button id="profile-submit" type="submit">Send</button>
      </form>
      <div id="content">No data-guardian markers here.</div>
    </body>
    </html>
  `);
});

app.get('/profile-invalid', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Profile Invalid</title></head>
    <body>
      <div id="content">Profile selector will not match anything here.</div>
    </body>
    </html>
  `);
});

app.get('/profile-heuristic', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Profile Heuristic</title></head>
    <body>
      <a href="/contact" aria-label="Contact us">Contact Us</a>
    </body>
    </html>
  `);
});
