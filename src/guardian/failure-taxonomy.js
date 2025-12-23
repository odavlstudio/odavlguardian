/**
 * Phase 4 — Failure Taxonomy
 * Deterministic categorization of failures by type, domain, and severity
 */

const BREAK_TYPES = {
  NAVIGATION: 'NAVIGATION',      // Failed to navigate or redirect
  SUBMISSION: 'SUBMISSION',      // Form/checkout submission failed
  VALIDATION: 'VALIDATION',      // Validator detected issue
  TIMEOUT: 'TIMEOUT',            // Step or interaction timed out
  VISUAL: 'VISUAL',              // Expected element not visible
  CONSOLE: 'CONSOLE',            // Console error detected
  NETWORK: 'NETWORK'             // Network/HTTP error
};

const IMPACT_DOMAINS = {
  REVENUE: 'REVENUE',
  LEAD: 'LEAD',
  TRUST: 'TRUST',
  UX: 'UX'
};

const SEVERITY_LEVELS = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL'
};

/**
 * Map attempt/flow ID to primary impact domain
 */
function getImpactDomain(attemptId) {
  const domainMap = {
    // Attempts
    contact_form: IMPACT_DOMAINS.LEAD,
    newsletter_signup: IMPACT_DOMAINS.LEAD,
    signup: IMPACT_DOMAINS.LEAD,
    language_switch: IMPACT_DOMAINS.TRUST,
    login: IMPACT_DOMAINS.TRUST,
    checkout: IMPACT_DOMAINS.REVENUE,

    // Flows
    signup_flow: IMPACT_DOMAINS.LEAD,
    login_flow: IMPACT_DOMAINS.TRUST,
    checkout_flow: IMPACT_DOMAINS.REVENUE
  };

  return domainMap[attemptId] || IMPACT_DOMAINS.UX;
}

/**
 * Classify a failure by type
 * @param {Object} failure - { error, outcome, friction, validators, failed_step, visualDiff, behavioralSignals }
 * @returns {string} BREAK_TYPE
 */
function classifyBreakType(failure) {
  const { error, outcome, friction, validators, failedStep, lastStep, visualDiff, behavioralSignals } = failure;
  const errorMsg = (error || '').toLowerCase();

  // Phase 5: Visual diff detected (regression)
  if (visualDiff && visualDiff.hasDiff) {
    return BREAK_TYPES.VISUAL;
  }

  // Phase 5: Behavioral signals (missing/disabled/hidden elements)
  if (behavioralSignals) {
    const signals = Array.isArray(behavioralSignals) ? behavioralSignals : [behavioralSignals];
    // Check for visual signals (hidden/missing elements) - from both signal and type properties
    if (signals.some(s => 
      (s.signal === 'ELEMENT_MISSING' || s.signal === 'OFFSCREEN_ELEMENT' || s.signal === 'CTA_HIDDEN') ||
      (s.type === 'ELEMENT_VISIBILITY' && (s.status === 'HIDDEN' || s.status === 'OFFSCREEN')) ||
      (s.type === 'LAYOUT_SHIFT' && s.status === 'DETECTED') ||
      (s.type === 'STYLE_CHANGE' && s.status === 'CHANGED')
    )) {
      return BREAK_TYPES.VISUAL;
    }
    // Check for accessibility signals (disabled elements) - from both signal and type properties
    if (signals.some(s => 
      (s.signal === 'DISABLED_ELEMENT' || s.signal === 'CTA_DISABLED') ||
      (s.type === 'CTA_ACCESSIBILITY' && (s.status === 'DISABLED' || s.status === 'HIDDEN'))
    )) {
      return BREAK_TYPES.VALIDATION;
    }
    // Any behavioral signal triggers at least a visual concern
    if (signals.length > 0) {
      return BREAK_TYPES.VISUAL;
    }
  }

  // Timeout (check before network since timeout can contain "timeout")
  if (errorMsg.includes('timeout') || errorMsg.includes('waitfor')) {
    return BREAK_TYPES.TIMEOUT;
  }

  // Navigation failures
  if (errorMsg.includes('navigation') || errorMsg.includes('goto') || errorMsg.includes('redirect')) {
    return BREAK_TYPES.NAVIGATION;
  }

  // Submission failures (check before form, focus on submit action)
  if (errorMsg.includes('submit') || (lastStep && lastStep.action === 'click' && lastStep.selector && lastStep.selector.includes('submit'))) {
    return BREAK_TYPES.SUBMISSION;
  }

  // Visual/element failures (check before generic validator)
  if (errorMsg.includes('screenshot') || errorMsg.includes('visual') || errorMsg.includes('selector') || errorMsg.includes('visible') || errorMsg.includes('element not found')) {
    return BREAK_TYPES.VISUAL;
  }

  // Validator failures
  if (validators && Array.isArray(validators) && validators.some(v => v.status === 'FAIL')) {
    return BREAK_TYPES.VALIDATION;
  }

  // Form-related failures
  if (errorMsg.includes('form')) {
    return BREAK_TYPES.SUBMISSION;
  }

  // Console errors
  if (errorMsg.includes('console') || errorMsg.includes('error logged')) {
    return BREAK_TYPES.CONSOLE;
  }

  // Network errors (default catch-all for connection issues)
  if (errorMsg.includes('network') || errorMsg.includes('refused') || errorMsg.includes('connection')) {
    return BREAK_TYPES.NETWORK;
  }

  // Default
  return BREAK_TYPES.VALIDATION;
}

/**
 * Determine severity based on domain and break type
 * @param {string} domain - IMPACT_DOMAIN
 * @param {string} breakType - BREAK_TYPE
 * @param {boolean} isFlow - true if this is a flow (higher severity)
 * @returns {string} SEVERITY_LEVEL
 */
function determineSeverity(domain, breakType, isFlow = false) {
  const baseScore = {
    [IMPACT_DOMAINS.REVENUE]: 80,
    [IMPACT_DOMAINS.LEAD]: 60,
    [IMPACT_DOMAINS.TRUST]: 55,
    [IMPACT_DOMAINS.UX]: 30
  }[domain] || 30;

  // Flows are inherently more critical than attempts
  const flowBonus = isFlow ? 20 : 0;

  // TIMEOUT and NETWORK are critical
  const typeBonus = (breakType === BREAK_TYPES.TIMEOUT || breakType === BREAK_TYPES.NETWORK) ? 15 : 0;

  const score = baseScore + flowBonus + typeBonus;

  if (score >= 75) return SEVERITY_LEVELS.CRITICAL;
  if (score >= 45) return SEVERITY_LEVELS.WARNING;
  return SEVERITY_LEVELS.INFO;
}

module.exports = {
  BREAK_TYPES,
  IMPACT_DOMAINS,
  SEVERITY_LEVELS,
  getImpactDomain,
  classifyBreakType,
  determineSeverity
};
