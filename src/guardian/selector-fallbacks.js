/**
 * Robust Selector Discovery with Fallbacks
 * 
 * Attempts to find elements using multiple strategies:
 * 1. data-guardian attributes (highest priority if site is instrumented)
 * 2. Semantic input types (email/password/text/submit)
 * 3. Autocomplete attributes (email/current-password/new-password)
 * 4. Name/ID contains patterns
 * 5. Role and ARIA attributes
 * 6. Link href patterns
 * 7. Visible text matching (case-insensitive)
 * 8. Heuristic form/button detection
 * 
 * Returns: { element, strategy, selector, confidence, discoverySignals }
 * discoverySignals includes: formsCounted, linksFound, buttonsCounted, finalSelection
 */

/**
 * Build selector chain for a specific element type
 * @param {string} goalType - email_input, password_input, submit_button, login_link, contact_link, language_toggle, etc.
 * @returns {string[]} Array of selectors in priority order
 */
function buildSelectorChain(goalType) {
  const chains = {
    email_input: [
      // data-guardian (site instrumented)
      '[data-guardian="email"], [data-guardian="login-email"], [data-guardian="signup-email"]',
      // semantic type
      'input[type="email"]',
      // autocomplete
      'input[autocomplete="email"], input[autocomplete*="email"]',
      // name/id patterns
      'input[name*="email" i], input[id*="email" i]',
      'input[name*="mail" i], input[id*="mail" i]',
      'input[name*="user" i], input[id*="user" i]',
      // placeholder
      'input[placeholder*="email" i], input[placeholder*="mail" i]',
      // aria-label
      'input[aria-label*="email" i], input[aria-label*="mail" i]',
      // broad form field with label
      'form input[type="text"]:first-of-type'
    ],
    
    password_input: [
      '[data-guardian="password"], [data-guardian="login-password"], [data-guardian="signup-password"]',
      'input[type="password"]',
      'input[autocomplete="current-password"], input[autocomplete="new-password"]',
      'input[name*="pass" i], input[id*="pass" i]',
      'input[name*="pwd" i], input[id*="pwd" i]',
      'input[placeholder*="pass" i], input[placeholder*="pwd" i]',
      'input[aria-label*="pass" i], input[aria-label*="pwd" i]'
    ],
    
    submit_button: [
      '[data-guardian="submit"], [data-guardian="login-submit"], [data-guardian="signup-submit"], [data-guardian="signup-account-submit"]',
      'button[type="submit"]',
      'button:has-text("Sign in") >> nth=0',
      'button:has-text("Sign up") >> nth=0',
      'button:has-text("Log in") >> nth=0',
      'button:has-text("Register") >> nth=0',
      'button:has-text("Submit") >> nth=0',
      'button:has-text("Send") >> nth=0',
      'button:has-text("Create account") >> nth=0',
      'button[name*="submit" i], button[id*="submit" i]',
      'input[type="submit"], input[type="button"][value*="Submit" i], input[type="button"][value*="Sign" i]',
      'button:not([type="reset"]):not([type="button"]):visible >> nth=0'
    ],
    
    contact_form: [
      '[data-guardian="contact-form"]',
      'form[name*="contact" i]',
      'form[id*="contact" i]',
      'form[class*="contact" i]',
      '[role="form"][aria-label*="contact" i]',
      'form >> nth=0' // Fallback: first form on page
    ],
    
    contact_link: [
      '[data-guardian="contact-link"]',
      'a[data-testid="contact-link"]',
      'a:has-text("Contact")',
      'a:has-text("Contact Us")',
      'a:has-text("Get in Touch")',
      'a[href*="/contact" i]',
      'a[href*="/contact-us" i]',
      'a[href*="/support" i]',
      'a[href="#contact" i]',
      'nav a:has-text("Contact")',
      '[role="navigation"] a:has-text("Contact")'
    ],
    
    login_link: [
      '[data-guardian="account-login-link"]',
      'a:has-text("Log in")',
      'a:has-text("Login")',
      'a:has-text("Sign in")',
      'a[href*="/login" i]',
      'a[href*="/signin" i]',
      'a[href*="/auth" i]',
      'a[href*="/account" i]',
      'nav a:has-text("Log in")'
    ],
    
    signup_link: [
      '[data-guardian="account-signup-link"]',
      'a:has-text("Sign up")',
      'a:has-text("Signup")',
      'a:has-text("Register")',
      'a:has-text("Create account")',
      'a[href*="/signup" i]',
      'a[href*="/sign-up" i]',
      'a[href*="/register" i]',
      'a[href*="/join" i]',
      'nav a:has-text("Sign up")'
    ],
    
    checkout_link: [
      '[data-guardian="checkout-link"]',
      'a:has-text("Checkout")',
      'a:has-text("Check out")',
      'a:has-text("Cart")',
      'a[href*="/checkout" i]',
      'a[href*="/cart" i]',
      'a[href*="/order" i]',
      'a[href*="/buy" i]'
    ],
    
    checkout_button: [
      '[data-guardian="checkout-place-order"]',
      'button:has-text("Checkout")',
      'button:has-text("Place order")',
      'button:has-text("Place Order")',
      'button:has-text("Complete purchase")',
      'button:has-text("Buy now")',
      'button[name*="checkout" i]'
    ],
    
    language_toggle: [
      '[data-guardian="lang-toggle"]',
      'button:has-text("Language")',
      'button:has-text("Lang")',
      'button[aria-label*="language" i]',
      'button[aria-label*="lang" i]',
      'select[name*="lang" i]',
      'select[id*="language" i]',
      'a[hreflang]:first-of-type'
    ],
    
    language_option_de: [
      '[data-guardian="lang-option-de"]',
      'button:has-text("DE")',
      'button:has-text("Deutsch")',
      'a[hreflang="de"]',
      '[lang="de"] >> nth=0'
    ],
    
    success_message: [
      '[data-guardian="success"]',
      '[data-testid="success"]',
      '.success-message',
      '.alert-success',
      '[role="alert"]:has-text("success")',
      '[role="alert"]:has-text("submitted")',
      '[role="alert"]:has-text("confirmed")',
      'div:has-text("success")'
    ]
  };

  return chains[goalType] || [];
}

/**
 * Attempt to find element using selector chain
 * @param {Page} page - Playwright page
 * @param {string[]} selectorChain - Array of selectors to try
 * @param {Object} options - { timeout, requireVisible }
 * @returns {Promise<{element, strategy, selector, confidence, discoverySignals}>}
 */
async function findElement(page, selectorChain, options = {}) {
  const { timeout = 5000, requireVisible = true } = options;
  const discoverySignals = {
    formsCounted: 0,
    linksCounted: 0,
    buttonsCounted: 0,
    candidatesEvaluated: [],
    finalSelection: null
  };

  if (!selectorChain || selectorChain.length === 0) {
    return {
      element: null,
      strategy: 'EMPTY_CHAIN',
      selector: null,
      confidence: 0,
      discoverySignals
    };
  }

  // Quick scan for discovery signals
  try {
    discoverySignals.formsCounted = (await page.locator('form').count()).toString();
    discoverySignals.linksCounted = (await page.locator('a').count()).toString();
    discoverySignals.buttonsCounted = (await page.locator('button').count()).toString();
  } catch (_) {
    // Non-critical
  }

  // Try each selector in chain
  for (let i = 0; i < selectorChain.length; i++) {
    const selector = selectorChain[i];
    try {
      const locator = page.locator(selector);
      const count = await locator.count();

      if (count > 0) {
        // Found candidate(s)
        discoverySignals.candidatesEvaluated.push({
          strategy: i,
          selector,
          found: count
        });

        // Use first match
        const element = locator.first();

        // Check visibility if required
        if (requireVisible) {
          const isVisible = await element.isVisible().catch(() => false);
          if (!isVisible) {
            discoverySignals.candidatesEvaluated[discoverySignals.candidatesEvaluated.length - 1].visible = false;
            continue; // Try next selector
          }
        }

        discoverySignals.finalSelection = {
          strategy: i,
          selector,
          found: count,
          used: 'first'
        };

        return {
          element,
          strategy: `FALLBACK_${i}`,
          selector,
          confidence: 0.95 - (i * 0.05), // Decrease confidence for later strategies
          discoverySignals
        };
      }
    } catch (err) {
      // Selector parse error or timeout - try next
      discoverySignals.candidatesEvaluated.push({
        strategy: i,
        selector,
        error: err.message
      });
      continue;
    }
  }

  // No element found
  return {
    element: null,
    strategy: 'NOT_FOUND',
    selector: null,
    confidence: 0,
    discoverySignals
  };
}

/**
 * Detect if a specific feature is present on the page
 * @param {Page} page - Playwright page
 * @param {string} featureType - 'login', 'signup', 'checkout', 'contact_form', 'newsletter', 'language_switch'
 * @returns {Promise<{present: boolean, confidence: number, evidence: string[]}>}
 */
async function detectFeature(page, featureType) {
  const evidence = [];

  try {
    switch (featureType) {
      case 'login': {
        // Look for login form, login link, or auth elements
        const hasLoginLink = (await page.locator('a:has-text("Log in"), a:has-text("Login"), a:has-text("Sign in")').count()) > 0;
        const hasLoginForm = (await page.locator('input[type="email"] + input[type="password"]').count()) > 0;
        const hasAuthSection = (await page.locator('[role="form"][aria-label*="login" i]').count()) > 0;

        if (hasLoginLink) evidence.push('login_link_found');
        if (hasLoginForm) evidence.push('auth_form_found');
        if (hasAuthSection) evidence.push('auth_section_found');

        return {
          present: hasLoginLink || hasLoginForm || hasAuthSection,
          confidence: evidence.length / 3,
          evidence
        };
      }

      case 'signup': {
        const hasSignupLink = (await page.locator('a:has-text("Sign up"), a:has-text("Signup"), a:has-text("Register")').count()) > 0;
        const hasSignupForm = (await page.locator('input[type="email"]').count()) > 0; // Weak signal
        const hasCreateText = (await page.locator('text=/create.*account/i').count()) > 0;

        if (hasSignupLink) evidence.push('signup_link_found');
        if (hasSignupForm) evidence.push('email_field_found');
        if (hasCreateText) evidence.push('create_account_text_found');

        return {
          present: hasSignupLink || (hasSignupForm && hasCreateText),
          confidence: evidence.length / 3,
          evidence
        };
      }

      case 'checkout': {
        const hasCheckoutLink = (await page.locator('a:has-text("Checkout"), a:has-text("Cart"), a[href*="/checkout" i]').count()) > 0;
        const hasPriceElements = (await page.locator('text=/\\$|€|¥|£/').count()) > 0;
        const hasAddToCart = (await page.locator('button:has-text("Add to cart"), a:has-text("Add to cart")').count()) > 0;

        if (hasCheckoutLink) evidence.push('checkout_link_found');
        if (hasPriceElements) evidence.push('price_indicators_found');
        if (hasAddToCart) evidence.push('add_to_cart_found');

        return {
          present: hasCheckoutLink || (hasPriceElements && hasAddToCart),
          confidence: evidence.length / 3,
          evidence
        };
      }

      case 'contact_form': {
        const hasContactForm = (await page.locator('form[name*="contact" i], form[id*="contact" i], [role="form"][aria-label*="contact"]').count()) > 0;
        const hasContactLink = (await page.locator('a:has-text("Contact")').count()) > 0;
        const hasEmailField = (await page.locator('input[type="email"]').count()) > 0;
        const hasMessageField = (await page.locator('textarea').count()) > 0;

        if (hasContactForm) evidence.push('contact_form_found');
        if (hasContactLink) evidence.push('contact_link_found');
        if (hasEmailField && hasMessageField) evidence.push('contact_form_elements_found');

        return {
          present: hasContactForm || hasContactLink || (hasEmailField && hasMessageField),
          confidence: evidence.length / 3,
          evidence
        };
      }

      case 'newsletter': {
        const hasNewsletterForm = (await page.locator('form[name*="newsletter" i], [aria-label*="newsletter" i]').count()) > 0;
        const hasSubscribeButton = (await page.locator('button:has-text("Subscribe"), button:has-text("Sign up")').count()) > 0;
        const hasNewsletterText = (await page.locator('text=/newsletter|subscribe/i').count()) > 0;

        if (hasNewsletterForm) evidence.push('newsletter_form_found');
        if (hasSubscribeButton) evidence.push('subscribe_button_found');
        if (hasNewsletterText) evidence.push('newsletter_text_found');

        return {
          present: hasNewsletterForm || (hasSubscribeButton && hasNewsletterText),
          confidence: evidence.length / 3,
          evidence
        };
      }

      case 'language_switch': {
        const hasLangButton = (await page.locator('button[aria-label*="language" i], button:has-text("Language")').count()) > 0;
        const hasLangSelect = (await page.locator('select[name*="lang" i]').count()) > 0;
        const hasMultipleLangs = (await page.locator('a[hreflang]').count()) > 1;
        const hasLangIndicator = (await page.locator('text=/en|de|fr|es|it|pt/i').count()) > 0;

        if (hasLangButton) evidence.push('lang_button_found');
        if (hasLangSelect) evidence.push('lang_select_found');
        if (hasMultipleLangs) evidence.push('hreflang_links_found');
        if (hasLangIndicator) evidence.push('lang_codes_found');

        return {
          present: hasLangButton || hasLangSelect || hasMultipleLangs,
          confidence: evidence.length / 4,
          evidence
        };
      }

      default:
        return { present: false, confidence: 0, evidence: [] };
    }
  } catch (err) {
    return { present: false, confidence: 0, evidence: [`error: ${err.message}`] };
  }
}

module.exports = {
  buildSelectorChain,
  findElement,
  detectFeature
};
