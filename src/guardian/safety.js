/**
 * Guardian Safety Guards Module
 * Prevents destructive or dangerous actions during testing
 */

class GuardianSafety {
  constructor(options = {}) {
    // URL patterns to avoid (logout, delete, admin, etc.)
    this.denyUrlPatterns = options.denyUrlPatterns || [
      'logout',
      'signout',
      'sign-out',
      'log-out',
      'delete',
      'remove',
      'destroy',
      'admin',
      'settings',
      'account/close',
      'account/delete',
      'unsubscribe',
      'cancel',
    ];

    // CSS selectors to avoid clicking
    this.denySelectors = options.denySelectors || [
      '[data-danger]',
      '[data-destructive]',
      '.btn-delete',
      '.btn-danger',
      '.delete-button',
      'button[type="reset"]',
      'a[href*="logout"]',
      'a[href*="delete"]',
      'a[href*="remove"]',
    ];

    // Form submissions require explicit permission
    this.blockFormSubmitsByDefault = options.blockFormSubmitsByDefault !== false;
    
    // Payment-related actions require explicit permission
    this.blockPaymentsByDefault = options.blockPaymentsByDefault !== false;
    
    // Payment-related keywords
    this.paymentKeywords = [
      'payment',
      'checkout',
      'purchase',
      'buy',
      'pay',
      'card',
      'billing',
      'stripe',
      'paypal',
    ];
  }

  /**
   * Check if URL is safe to visit
   * @param {string} url - URL to check
   * @returns {object} { safe: boolean, reason: string }
   */
  isUrlSafe(url) {
    try {
      const urlLower = url.toLowerCase();
      
      for (const pattern of this.denyUrlPatterns) {
        if (urlLower.includes(pattern.toLowerCase())) {
          return {
            safe: false,
            reason: `URL contains blocked pattern: "${pattern}"`,
          };
        }
      }

      return { safe: true, reason: null };
    } catch (error) {
      return {
        safe: false,
        reason: `Invalid URL: ${error.message}`,
      };
    }
  }

  /**
   * Check if selector is safe to click
   * @param {string} selector - CSS selector
   * @returns {object} { safe: boolean, reason: string }
   */
  isSelectorSafe(selector) {
    try {
      const selectorLower = selector.toLowerCase();
      
      for (const denyPattern of this.denySelectors) {
        if (selectorLower.includes(denyPattern.toLowerCase())) {
          return {
            safe: false,
            reason: `Selector matches blocked pattern: "${denyPattern}"`,
          };
        }
      }

      return { safe: true, reason: null };
    } catch (error) {
      return {
        safe: false,
        reason: `Invalid selector: ${error.message}`,
      };
    }
  }

  /**
   * Check if element text suggests dangerous action
   * @param {string} text - Element text content
   * @returns {object} { safe: boolean, reason: string }
   */
  isTextSafe(text) {
    if (!text) {
      return { safe: true, reason: null };
    }

    const textLower = text.toLowerCase().trim();
    const dangerousWords = [
      'logout',
      'log out',
      'sign out',
      'delete',
      'remove',
      'destroy',
      'cancel account',
      'close account',
      'unsubscribe',
    ];

    for (const word of dangerousWords) {
      if (textLower.includes(word)) {
        return {
          safe: false,
          reason: `Text contains dangerous word: "${word}"`,
        };
      }
    }

    return { safe: true, reason: null };
  }

  /**
   * Check if action involves payment
   * @param {string} context - Context (URL, selector, or text)
   * @returns {boolean} True if payment-related
   */
  isPaymentRelated(context) {
    if (!context) {
      return false;
    }

    const contextLower = context.toLowerCase();
    
    for (const keyword of this.paymentKeywords) {
      if (contextLower.includes(keyword)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if form submission is safe
   * @param {string} formAction - Form action URL or selector
   * @param {object} formData - Form data being submitted
   * @returns {object} { safe: boolean, reason: string }
   */
  isFormSubmitSafe(formAction, formData = {}) {
    // Check if form submissions are globally blocked
    if (this.blockFormSubmitsByDefault) {
      return {
        safe: false,
        reason: 'Form submissions are blocked by default (safety guard)',
      };
    }

    // Check if form action URL is safe
    if (formAction) {
      const urlCheck = this.isUrlSafe(formAction);
      if (!urlCheck.safe) {
        return urlCheck;
      }

      // Check if payment-related
      if (this.blockPaymentsByDefault && this.isPaymentRelated(formAction)) {
        return {
          safe: false,
          reason: 'Form submission appears payment-related (blocked by safety guard)',
        };
      }
    }

    // Check form data for sensitive fields
    const formDataStr = JSON.stringify(formData).toLowerCase();
    if (this.blockPaymentsByDefault && this.isPaymentRelated(formDataStr)) {
      return {
        safe: false,
        reason: 'Form data contains payment-related fields (blocked by safety guard)',
      };
    }

    return { safe: true, reason: null };
  }

  /**
   * Filter URLs to remove unsafe ones
   * @param {string[]} urls - Array of URLs
   * @returns {object} { safe: string[], blocked: Array<{url, reason}> }
   */
  filterUrls(urls) {
    const safe = [];
    const blocked = [];

    for (const url of urls) {
      const check = this.isUrlSafe(url);
      if (check.safe) {
        safe.push(url);
      } else {
        blocked.push({ url, reason: check.reason });
      }
    }

    return { safe, blocked };
  }

  /**
   * Get safety summary (how many URLs/actions were blocked)
   * @param {object} stats - Statistics object
   * @returns {object} Safety summary
   */
  getSummary(stats = {}) {
    return {
      urlsBlocked: stats.urlsBlocked || 0,
      selectorsBlocked: stats.selectorsBlocked || 0,
      formsBlocked: stats.formsBlocked || 0,
      totalBlocked: (stats.urlsBlocked || 0) + (stats.selectorsBlocked || 0) + (stats.formsBlocked || 0),
      safetyEnabled: true,
    };
  }
}

module.exports = GuardianSafety;
