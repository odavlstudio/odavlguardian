/**
 * Attempt Relevance Decision Engine
 * Determines which attempts should run based on site introspection.
 */

/**
 * Relevance rules mapping attempt IDs to required introspection flags
 */
const RELEVANCE_RULES = {
  'contact_form': { requires: 'hasContactForm', reason: 'No contact form detected' },
  'language_switch': { requires: 'hasLanguageSwitch', reason: 'No language switch detected' },
  'signup': { requires: 'hasSignup', reason: 'No signup elements detected' },
  'login': { requires: 'hasLogin', reason: 'No login elements detected' },
  'checkout': { requires: 'hasCheckout', reason: 'No checkout elements detected' },
  'newsletter_signup': { requires: 'hasNewsletter', reason: 'No newsletter signup detected' }
};

/**
 * Filter attempts based on site introspection
 * 
 * @param {Array} attempts - Array of attempt objects with {id, ...}
 * @param {Object} introspection - Result from inspectSite()
 * @returns {Object} { toRun: Array, toSkip: Array }
 */
function filterAttempts(attempts, introspection) {
  const toRun = [];
  const toSkip = [];

  for (const attempt of attempts) {
    const rule = RELEVANCE_RULES[attempt.id];

    if (!rule) {
      // No rule defined: always run (universal attempts)
      toRun.push(attempt);
      continue;
    }

    // Check if introspection flag is true
    const flagValue = introspection[rule.requires];
    
    if (flagValue === true) {
      toRun.push(attempt);
    } else {
      toSkip.push({
        attempt: attempt.id,
        reason: rule.reason
      });
    }
  }

  return { toRun, toSkip };
}

/**
 * Check if an attempt should be skipped
 * 
 * @param {string} attemptId - The attempt ID
 * @param {Object} introspection - Result from inspectSite()
 * @returns {Object|null} Skip info {reason} or null if should run
 */
function shouldSkipAttempt(attemptId, introspection) {
  const rule = RELEVANCE_RULES[attemptId];

  if (!rule) {
    // No rule: never skip
    return null;
  }

  const flagValue = introspection[rule.requires];
  
  if (flagValue === true) {
    return null; // Should run
  } else {
    return { reason: rule.reason };
  }
}

/**
 * Get human-readable summary of introspection results
 * 
 * @param {Object} introspection - Result from inspectSite()
 * @returns {string} Summary text
 */
function summarizeIntrospection(introspection) {
  const detected = [];
  
  if (introspection.hasLogin) detected.push('login');
  if (introspection.hasSignup) detected.push('signup');
  if (introspection.hasCheckout) detected.push('checkout');
  if (introspection.hasNewsletter) detected.push('newsletter');
  if (introspection.hasContactForm) detected.push('contact form');
  if (introspection.hasLanguageSwitch) detected.push('language switch');

  if (detected.length === 0) {
    return 'No specific capabilities detected';
  }

  return `Detected: ${detected.join(', ')}`;
}

module.exports = {
  RELEVANCE_RULES,
  filterAttempts,
  shouldSkipAttempt,
  summarizeIntrospection
};
