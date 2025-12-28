/**
 * Site Introspection - DOM-based capability detection
 * Deterministically identifies site features by inspecting the loaded page.
 */

/**
 * Inspect the page for various capabilities
 * 
 * @param {Page} page - Playwright page object (already loaded)
 * @returns {Promise<Object>} introspection results
 */
async function inspectSite(page) {
  const introspection = {
    hasLogin: false,
    hasSignup: false,
    hasCheckout: false,
    hasNewsletter: false,
    hasContactForm: false,
    hasLanguageSwitch: false,
    hasContentSignals: false
  };

  try {
    // Check for forms - basic existence
    const hasForms = await page.evaluate(() => {
      return document.querySelectorAll('form').length > 0;
    });

    // Check for login indicators — STRONG SIGNALS ONLY
    introspection.hasLogin = await page.evaluate(() => {
      const isValidHrefForAuth = (href) => {
        if (!href) return false;
        const h = href.trim().toLowerCase();
        if (h.startsWith('javascript:')) return false;
        if (h.startsWith('#')) return false;
        try {
          const u = new URL(h, window.location.origin);
          const p = u.pathname.toLowerCase();
          return /(\/login|\/signin|\/sign-in|\/auth\/login)$|\/(login|signin)(\/|$)/.test(p);
        } catch (_) {
          return false;
        }
      };

      // Strong signal 1: password input on page
      const hasPasswordInput = document.querySelectorAll('input[type="password"]').length > 0;

      // Strong signal 2: a form containing a password field
      const formWithPassword = Array.from(document.querySelectorAll('form')).some(f => f.querySelector('input[type="password"]'));

      // Strong signal 3: link/button to common auth routes
      const authRouteLink = Array.from(document.querySelectorAll('a')).some(a => isValidHrefForAuth(a.getAttribute('href')));

      return hasPasswordInput || formWithPassword || authRouteLink;
    });

    // Check for signup indicators — STRONG SIGNALS ONLY
    introspection.hasSignup = await page.evaluate(() => {
      const isValidHrefForSignup = (href) => {
        if (!href) return false;
        const h = href.trim().toLowerCase();
        if (h.startsWith('javascript:')) return false;
        if (h.startsWith('#')) return false;
        try {
          const u = new URL(h, window.location.origin);
          const p = u.pathname.toLowerCase();
          return /(\/signup|\/register|\/sign-up|\/auth\/signup)$|\/(signup|register|sign-up)(\/|$)/.test(p);
        } catch (_) {
          return false;
        }
      };

      // Strong signal 1: form that contains a password field AND signup/register text
      const formWithPasswordAndSignupText = Array.from(document.querySelectorAll('form')).some(form => {
        const hasPwd = !!form.querySelector('input[type="password"]');
        if (!hasPwd) return false;
        const txt = (form.textContent || '').toLowerCase();
        return /\b(sign ?up|register|create account|join|get started)\b/.test(txt);
      });

      // Strong signal 2: auth route link to signup/register paths
      const authRouteLink = Array.from(document.querySelectorAll('a')).some(a => isValidHrefForSignup(a.getAttribute('href')));

      return formWithPasswordAndSignupText || authRouteLink;
    });

    // Check for checkout/cart indicators — STRONG SIGNALS ONLY
    introspection.hasCheckout = await page.evaluate(() => {
      const isValidHrefForCheckout = (href) => {
        if (!href) return false;
        const h = href.trim().toLowerCase();
        if (h.startsWith('javascript:')) return false;
        if (h.startsWith('#')) return false;
        try {
          const u = new URL(h, window.location.origin);
          const p = u.pathname.toLowerCase();
          // Strong checkout/cart routes
          return /(\/cart|\/checkout|\/basket)$|\/(cart|checkout|basket)(\/|$)/.test(p);
        } catch (_) {
          return false;
        }
      };

      // Strong signal 1: auth route links to cart/checkout/basket
      const routeLink = Array.from(document.querySelectorAll('a')).some(a => isValidHrefForCheckout(a.getAttribute('href')));

      // Strong signal 2: buttons with explicit commerce actions
      const commerceButtons = Array.from(document.querySelectorAll('button, input[type="submit"]')).some(btn => {
        const text = (btn.textContent || btn.value || '').toLowerCase();
        return /\b(add to cart|buy now|checkout|purchase)\b/.test(text);
      });

      // Strong signal 3: explicit cart identifiers
      const cartIndicators = Array.from(document.querySelectorAll('[id*="cart" i], [class*="cart" i], [class*="basket" i]')).length > 0;

      return routeLink || commerceButtons || cartIndicators;
    });

    // Check for newsletter signup
    introspection.hasNewsletter = await page.evaluate(() => {
      // Check for newsletter-specific inputs
      const hasNewsletterInput = Array.from(document.querySelectorAll('input[type="email"]')).some(input => {
        const placeholder = (input.placeholder || '').toLowerCase();
        const id = (input.id || '').toLowerCase();
        const name = (input.name || '').toLowerCase();
        return placeholder.match(/newsletter|subscribe|email/) || 
               id.match(/newsletter|subscribe/) || 
               name.match(/newsletter|subscribe/);
      });

      // Check for newsletter text
      const hasNewsletterText = Array.from(document.querySelectorAll('form, div')).some(el => {
        const text = (el.textContent || '').toLowerCase();
        return text.match(/\b(newsletter|subscribe to|stay updated|get updates)\b/);
      });

      return hasNewsletterInput || hasNewsletterText;
    });

    // Check for contact form
    introspection.hasContactForm = await page.evaluate(() => {
      // Check links
      const contactLinks = Array.from(document.querySelectorAll('a')).some(a => {
        const text = (a.textContent || '').toLowerCase();
        const href = (a.href || '').toLowerCase();
        return text.match(/\b(contact|contact us|get in touch)\b/) || 
               href.match(/\/contact/);
      });

      // Check for forms with contact-related fields
      const hasContactForm = Array.from(document.querySelectorAll('form')).some(form => {
        const formText = (form.textContent || '').toLowerCase();
        const hasNameField = form.querySelectorAll('input[name*="name"]').length > 0;
        const hasEmailField = form.querySelectorAll('input[type="email"]').length > 0;
        const hasMessageField = form.querySelectorAll('textarea').length > 0;
        return formText.match(/contact|message|inquiry/) && hasNameField && hasEmailField && hasMessageField;
      });

      return contactLinks || hasContactForm;
    });

    // Check for language switch
    introspection.hasLanguageSwitch = await page.evaluate(() => {
      // Check for language selectors
      const hasLangSelect = Array.from(document.querySelectorAll('select')).some(select => {
        const id = (select.id || '').toLowerCase();
        const name = (select.name || '').toLowerCase();
        return id.match(/lang|language/) || name.match(/lang|language/);
      });

      // Check for language links (common patterns)
      const hasLangLinks = Array.from(document.querySelectorAll('a, button')).some(el => {
        const text = (el.textContent || '').toLowerCase().trim();
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
        // Common language codes
        return text.match(/^(en|es|fr|de|it|pt|ja|zh|ko|ru)$/i) || 
               ariaLabel.match(/language|lang/) ||
               text.match(/\b(english|español|français|deutsch)\b/i);
      });

      // Check for globe icon (common language switch indicator)
      const hasGlobeIcon = Array.from(document.querySelectorAll('[class*="globe"], [class*="lang"], [class*="language"]')).length > 0;

      return hasLangSelect || hasLangLinks || hasGlobeIcon;
    });

    // Content signals (generic): many internal links + article-like structure
    introspection.hasContentSignals = await page.evaluate(() => {
      try {
        const originHost = window.location.hostname;
        const internalLinks = Array.from(document.querySelectorAll('a')).filter(a => {
          const href = a.getAttribute('href');
          if (!href) return false;
          const h = href.trim().toLowerCase();
          if (h.startsWith('javascript:')) return false;
          if (h.startsWith('#')) return false;
          try {
            const u = new URL(h, window.location.origin);
            return u.hostname === originHost;
          } catch (_) {
            return false;
          }
        });

        const mainEl = document.querySelector('main') || document.querySelector('article');
        const paragraphCount = mainEl ? mainEl.querySelectorAll('p').length : 0;

        const manyInternalLinks = internalLinks.length >= 20;
        const hasArticleStructure = paragraphCount >= 10;

        // Tiny special-case acceptable for Wikipedia (high confidence content site)
        const isWikipedia = /(^|\.)wikipedia\.org$/.test(window.location.hostname);

        return (manyInternalLinks && hasArticleStructure) || isWikipedia;
      } catch (_) {
        return false;
      }
    });

  } catch (error) {
    // If introspection fails, return all false (fail-safe)
    console.warn(`[Introspection] Error during site inspection: ${error.message}`);
  }

  return introspection;
}

/**
 * Detect site profile based on introspection results
 * 
 * @param {Object} introspection - Result from inspectSite()
 * @returns {string} Profile: 'ecommerce', 'saas', 'content', or 'unknown'
 */
function detectProfile(introspection) {
  // E-commerce: strong checkout/cart signals
  if (introspection.hasCheckout) {
    return 'ecommerce';
  }

  // SaaS: strong auth signals (login/signup) and no checkout
  if ((introspection.hasLogin || introspection.hasSignup)) {
    return 'saas';
  }

  // Content site: absence of ecommerce & saas; presence of content signals
  if (introspection.hasLanguageSwitch || introspection.hasContactForm || introspection.hasContentSignals) {
    return 'content';
  }

  // Unknown: nothing detected
  return 'unknown';
}

module.exports = {
  inspectSite,
  detectProfile
};
