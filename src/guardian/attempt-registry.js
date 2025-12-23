/**
 * Central registry for attempt definitions
 * Phase 3: supports multiple curated attempts
 */

const DEFAULT_ATTEMPTS = ['contact_form', 'language_switch', 'newsletter_signup', 'signup', 'login', 'checkout'];

const attemptDefinitions = {
  contact_form: {
    id: 'contact_form',
    name: 'Contact Form Submission',
    goal: 'User submits the contact form successfully',
    riskCategory: 'LEAD',
    baseSteps: [
      { id: 'navigate_form', type: 'navigate', target: '$BASEURL', description: 'Navigate to contact form' },
      {
        id: 'open_contact_page',
        type: 'click',
        target: 'a[data-guardian="contact-link"], a[data-testid="contact-link"], a:has-text("Contact"), a[href*="/contact"]',
        description: 'Open contact page',
        optional: true,
        waitForNavigation: true
      },
      { id: 'fill_name', type: 'type', target: 'input[name="name"], input[data-testid="name"], input[data-guardian="name"]', value: 'Test User', description: 'Enter name', timeout: 5000 },
      { id: 'fill_email', type: 'type', target: 'input[name="email"], input[data-testid="email"], input[type="email"], input[data-guardian="email"]', value: 'test@example.com', description: 'Enter email', timeout: 5000 },
      { id: 'fill_message', type: 'type', target: 'textarea[name="message"], textarea[data-testid="message"], input[name="message"], textarea[data-guardian="message"]', value: 'This is a test message.', description: 'Enter message', timeout: 5000 },
      { id: 'submit_form', type: 'click', target: 'button[type="submit"], button:has-text("Submit"), button:has-text("Send"), button[data-guardian="submit"]', description: 'Submit form', timeout: 5000 }
    ],
    successConditions: [
      { type: 'selector', target: '[data-guardian="success"], [data-testid="success"]', description: 'Success message element visible' }
    ],
    // Phase 2: Soft failure validators
    validators: [
      // Success indicators
      { type: 'elementVisible', selector: '[data-guardian="success"], [data-testid="success"], .success-message, .alert-success' },
      { type: 'pageContainsAnyText', textList: ['success', 'submitted', 'thank you', 'message received'] },
      // Error/failure indicators that would make this a SOFT FAILURE
      { type: 'elementNotVisible', selector: '.error, [role="alert"], .form-error, .error-message' }
    ]
  },

  language_switch: {
    id: 'language_switch',
    name: 'Language Toggle',
    goal: 'User switches language successfully',
    riskCategory: 'TRUST/UX',
    baseSteps: [
      { id: 'navigate_home', type: 'navigate', target: '$BASEURL', description: 'Navigate to home page' },
      { id: 'open_language_page', type: 'click', target: 'a[data-guardian="language-link"], a:has-text("Language Switch")', description: 'Open language switch page', timeout: 5000 },
      { id: 'open_language_toggle', type: 'click', target: '[data-guardian="lang-toggle"], button:has-text("Language"), button:has-text("Lang")', description: 'Open language toggle', timeout: 5000 },
      { id: 'select_language', type: 'click', target: '[data-guardian="lang-option-de"], [data-testid="lang-option-de"], button:has-text("DE")', description: 'Switch to German', timeout: 5000 },
      { id: 'verify_language', type: 'waitFor', target: '[data-guardian="lang-current"]:has-text("DE")', description: 'Wait for language to switch to DE', timeout: 5000 }
    ],
    successConditions: [
      { type: 'selector', target: '[data-guardian="lang-current"]:has-text("DE")', description: 'Current language shows DE' },
      { type: 'selector', target: '[data-guardian="lang-current"], [data-testid="lang-current"]', description: 'Language indicator visible' }
    ],
    // Phase 2: Language switch validators
    validators: [
      { type: 'htmlLangAttribute', lang: 'de' },
      { type: 'pageContainsAnyText', textList: ['Deutsch', 'German', 'Sprache'] }
    ]
  },

  newsletter_signup: {
    id: 'newsletter_signup',
    name: 'Newsletter Signup',
    goal: 'User signs up for newsletter',
    riskCategory: 'LEAD',
    baseSteps: [
      { id: 'navigate_home', type: 'navigate', target: '$BASEURL', description: 'Navigate to home page' },
      {
        id: 'open_signup_page',
        type: 'click',
        target: 'a[data-guardian="signup-link"], a[data-testid="signup-link"], a:has-text("Sign up"), a:has-text("Signup"), a[href*="signup"], a[href*="newsletter"]',
        description: 'Open signup page',
        optional: true,
        waitForNavigation: true
      },
      { id: 'fill_email', type: 'type', target: 'input[type="email"], input[data-guardian="signup-email"], input[data-testid="signup-email"]', value: 'subscriber@example.com', description: 'Enter email', timeout: 5000 },
      { id: 'submit_signup', type: 'click', target: 'button[type="submit"], button[data-guardian="signup-submit"], button:has-text("Subscribe"), button:has-text("Sign up")', description: 'Submit signup', timeout: 5000 }
    ],
    successConditions: [
      { type: 'selector', target: '[data-guardian="signup-success"], [data-testid="signup-success"]', description: 'Signup success message visible' }
    ],
    // Phase 2: Newsletter signup validators
    validators: [
      { type: 'elementVisible', selector: '[data-guardian="signup-success"], [data-testid="signup-success"], .signup-success, .toast-success' },
      { type: 'pageContainsAnyText', textList: ['confirmed', 'subscribed', 'thank you', 'welcome', 'subscription'] },
      { type: 'elementNotVisible', selector: '.error, [role="alert"], .signup-error, .error-message' }
    ]
  },

  signup: {
    id: 'signup',
    name: 'Account Signup',
    goal: 'User creates an account successfully',
    riskCategory: 'LEAD',
    baseSteps: [
      { id: 'navigate_home', type: 'navigate', target: '$BASEURL', description: 'Navigate to home page' },
      { id: 'open_account_signup', type: 'click', target: 'a[data-guardian="account-signup-link"], a:has-text("Account Signup")', description: 'Open account signup', optional: true, waitForNavigation: true, timeout: 5000 },
      { id: 'fill_signup_email', type: 'type', target: '[data-guardian="signup-email"]', value: 'newuser@example.com', description: 'Enter signup email', timeout: 5000 },
      { id: 'fill_signup_password', type: 'type', target: '[data-guardian="signup-password"]', value: 'P@ssword123', description: 'Enter signup password', timeout: 5000 },
      { id: 'submit_signup_account', type: 'click', target: '[data-guardian="signup-account-submit"], button:has-text("Sign up")', description: 'Submit account signup', timeout: 5000 },
      { id: 'wait_signup_success', type: 'waitFor', target: '[data-guardian="signup-account-success"]', description: 'Wait for signup success', timeout: 7000 }
    ],
    successConditions: [
      { type: 'selector', target: '[data-guardian="signup-account-success"]', description: 'Account signup success visible' }
    ],
    validators: [
      { type: 'elementVisible', selector: '[data-guardian="signup-account-success"]' },
      { type: 'pageContainsAnyText', textList: ['Account created', 'created', 'welcome aboard'] },
      { type: 'elementNotVisible', selector: '[data-guardian="signup-account-error"], .error, [role="alert"]' }
    ]
  },

  login: {
    id: 'login',
    name: 'Account Login',
    goal: 'User logs in successfully (single session)',
    riskCategory: 'TRUST/UX',
    baseSteps: [
      { id: 'navigate_home', type: 'navigate', target: '$BASEURL', description: 'Navigate to home page' },
      { id: 'open_login_page', type: 'click', target: 'a[data-guardian="account-login-link"], a:has-text("Login"), a[href*="login"]', description: 'Open login page', optional: true, waitForNavigation: true, timeout: 5000 },
      { id: 'fill_login_email', type: 'type', target: '[data-guardian="login-email"]', value: 'user@example.com', description: 'Enter login email', timeout: 5000 },
      { id: 'fill_login_password', type: 'type', target: '[data-guardian="login-password"]', value: 'password123', description: 'Enter login password', timeout: 5000 },
      { id: 'submit_login', type: 'click', target: '[data-guardian="login-submit"], button:has-text("Login")', description: 'Submit login', timeout: 5000 },
      { id: 'wait_login_success', type: 'waitFor', target: '[data-guardian="login-success"]', description: 'Wait for login success', timeout: 7000 }
    ],
    successConditions: [
      { type: 'selector', target: '[data-guardian="login-success"]', description: 'Login success visible' }
    ],
    validators: [
      { type: 'elementVisible', selector: '[data-guardian="login-success"]' },
      { type: 'pageContainsAnyText', textList: ['logged in', 'welcome back', 'logged'] },
      { type: 'elementNotVisible', selector: '[data-guardian="login-error"], .error, [role="alert"]' }
    ]
  },

  checkout: {
    id: 'checkout',
    name: 'Checkout Review',
    goal: 'User places order without payment',
    riskCategory: 'REVENUE',
    baseSteps: [
      { id: 'navigate_home', type: 'navigate', target: '$BASEURL', description: 'Navigate to home page' },
      { id: 'open_checkout', type: 'click', target: 'a[data-guardian="checkout-link"], a:has-text("Checkout"), a[href*="checkout"]', description: 'Open checkout page', optional: true, waitForNavigation: true, timeout: 5000 },
      { id: 'place_order', type: 'click', target: '[data-guardian="checkout-place-order"], button:has-text("Place order"), button:has-text("Place Order")', description: 'Place order', timeout: 5000 },
      { id: 'wait_order_success', type: 'waitFor', target: '[data-guardian="checkout-success"]', description: 'Wait for order confirmation', timeout: 7000 }
    ],
    successConditions: [
      { type: 'selector', target: '[data-guardian="checkout-success"]', description: 'Checkout success visible' }
    ],
    validators: [
      { type: 'elementVisible', selector: '[data-guardian="checkout-success"]' },
      { type: 'pageContainsAnyText', textList: ['order placed', 'order confirmed', 'order confirmed'] },
      { type: 'elementNotVisible', selector: '[data-guardian="checkout-error"], .error, [role="alert"]' }
    ]
  },

  // Universal Reality Pack: deterministic, zero-config safety checks
  universal_reality: {
    id: 'universal_reality',
    name: 'Universal Reality Pack',
    goal: 'Basic site usability and safety checks',
    riskCategory: 'TRUST/UX',
    baseSteps: [
      { id: 'navigate_home', type: 'navigate', target: '$BASEURL', description: 'Navigate to home page' },
      { id: 'wait_for_body', type: 'waitFor', target: 'body', description: 'Ensure page body is visible', timeout: 5000 },
      // Safe navigation probe (optional)
      {
        id: 'probe_safe_nav',
        type: 'click',
        target: 'nav a[href], header a[href], a[href]:not([href^="mailto:"]):not([href^="tel:"]):not([href^="javascript:"])',
        description: 'Click a safe visible link',
        optional: true,
        waitForNavigation: true
      }
    ],
    successConditions: [
      // Consider success if body is visible (page loaded) or URL still valid
      { type: 'selector', target: 'body', description: 'Page loaded and visible' }
    ],
    // Deterministic validators for soft issues
    validators: [
      // Minimal content heuristics
      { type: 'elementVisible', selector: 'nav, header' },
      { type: 'pageContainsAnyText', textList: ['home', 'about', 'contact', 'privacy', 'terms'] },
      // Console errors as soft failures (WARN/FAIL recorded, outcome unchanged)
      { type: 'noConsoleErrorsAbove', minSeverity: 'error' }
    ]
  }
};

function getAttemptDefinition(id) {
  return attemptDefinitions[id] || null;
}

function getDefaultAttemptIds() {
  return DEFAULT_ATTEMPTS.slice();
}

function listAttemptDefinitions() {
  return Object.values(attemptDefinitions);
}

/**
 * Phase 2: Dynamically register an auto-generated attempt
 * @param {Object} attemptDef - Attempt definition with id, name, baseSteps, validators
 */
function registerAttempt(attemptDef) {
  if (!attemptDef || !attemptDef.id) {
    throw new Error('Cannot register attempt: missing id');
  }
  if (attemptDefinitions[attemptDef.id]) {
    console.warn(`⚠️  Attempt ${attemptDef.id} already registered, skipping`);
    return;
  }
  attemptDefinitions[attemptDef.id] = attemptDef;
}

module.exports = {
  getAttemptDefinition,
  getDefaultAttemptIds,
  listAttemptDefinitions,
  registerAttempt
};