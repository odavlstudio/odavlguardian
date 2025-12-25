/**
 * Phase 4 — Breakage Intelligence
 * Aggregate failure taxonomy and hints into actionable summaries
 */

const {
  BREAK_TYPES,
  IMPACT_DOMAINS,
  SEVERITY_LEVELS,
  getImpactDomain,
  classifyBreakType,
  determineSeverity
} = require('./failure-taxonomy');
const { deriveRootCauseHints } = require('./root-cause-analysis');

/**
 * Analyze a single attempt/flow failure and produce intelligence
 * @param {Object} item - Attempt or flow result with outcome, error, validators, visualDiff, behavioralSignals, etc.
 * @param {boolean} isFlow - true if this is a flow
 * @returns {Object} Intelligence object with taxonomy, hints, actions
 */
function analyzeFailure(item, isFlow = false) {
  if (!item || item.outcome === 'SUCCESS') {
    return null;
  }

  const domain = getImpactDomain(isFlow ? item.flowId : item.attemptId);
  const breakType = classifyBreakType(item);
  const severity = determineSeverity(domain, breakType, isFlow);
  const { hints, primaryHint } = deriveRootCauseHints(item, breakType);

  // Phase 5: Include visual regression metadata
  const intelligence = {
    id: isFlow ? item.flowId : item.attemptId,
    name: isFlow ? item.flowName : item.attemptName,
    outcome: item.outcome,
    source: isFlow ? 'flow' : 'attempt',
    breakType,
    domain,
    severity,
    primaryHint,
    hints,
    whyItMatters: generateWhyItMatters(domain, severity, breakType),
    topActions: generateTopActions(breakType, domain)
  };

  // Phase 5: Add visual regression details if available
  if (item.visualDiff) {
    intelligence.visualDiff = {
      hasDiff: item.visualDiff.hasDiff,
      percentChange: item.visualDiff.percentChange,
      reason: item.visualDiff.reason,
      diffRegions: item.visualDiff.diffRegions
    };
  }

  // Phase 5: Add behavioral signals if available
  if (item.behavioralSignals) {
    intelligence.behavioralSignals = item.behavioralSignals;
  }

  return intelligence;
}

/**
 * Generate 1–3 bullet "Why It Matters" summary
 * @param {string} domain - IMPACT_DOMAIN
 * @param {string} severity - SEVERITY_LEVEL
 * @returns {string[]} Array of 1–3 bullets
 */
function generateWhyItMatters(domain, severity, breakType = null) {
  const bullets = [];

  // Domain-specific impact
  if (domain === IMPACT_DOMAINS.REVENUE) {
    bullets.push('🚨 Revenue impact: Checkout/payment flow is broken. Customers cannot complete purchases.');
  } else if (domain === IMPACT_DOMAINS.LEAD) {
    bullets.push('📉 Lead gen impact: Signup/contact flow is broken. Cannot capture customer interest.');
  } else if (domain === IMPACT_DOMAINS.TRUST) {
    bullets.push('⚠️  Trust impact: Auth/account flow is broken. Users cannot access their data.');
  } else {
    bullets.push('📊 UX impact: Core interaction is broken. User journey degraded.');
  }

  // Severity escalation
  if (severity === SEVERITY_LEVELS.CRITICAL) {
    bullets.push('🔴 CRITICAL: Escalate immediately. Page/API down or core feature broken.');
  } else if (severity === SEVERITY_LEVELS.WARNING) {
    bullets.push('🟡 WARNING: High priority. Fix before peak traffic to avoid customer impact.');
  }

  // Phase 5: Visual regression context
  if (breakType === BREAK_TYPES.VISUAL) {
    bullets.push('👁️  Visual regression: UI elements changed from baseline (CSS, layout, or styling).');
    if (severity === SEVERITY_LEVELS.CRITICAL) {
      bullets.push('Critical visual change may completely obscure content or block user interaction.');
    } else if (severity === SEVERITY_LEVELS.WARNING) {
      bullets.push('Visual change may degrade readability, accessibility, or user experience.');
    }
  }

  return bullets;
}

/**
 * Generate top 3 actionable next steps
 * @param {string} breakType - BREAK_TYPE
 * @param {string} domain - IMPACT_DOMAIN
 * @returns {string[]} Array of 3 action strings
 */
function generateTopActions(breakType, domain) {
  const actions = [];

  // Break-type-specific actions
  if (breakType === BREAK_TYPES.NAVIGATION || breakType === BREAK_TYPES.NETWORK) {
    actions.push('1. Check server status and network logs for errors');
    actions.push('2. Verify DNS and SSL certificate validity');
    actions.push('3. Check CDN/load balancer for 5xx errors');
  } else if (breakType === BREAK_TYPES.TIMEOUT) {
    actions.push('1. Check server response times and database queries');
    actions.push('2. Review recent deployments for performance regressions');
    actions.push('3. Check if rate limiting is too strict');
  } else if (breakType === BREAK_TYPES.VISUAL) {
    // Phase 5: Visual-specific diagnostic actions
    actions.push('1. Compare baseline screenshot to current; identify CSS/layout changes');
    actions.push('2. Check recent CSS commits, theme changes, or Tailwind/Bootstrap updates');
    actions.push('3. Validate element positioning using browser DevTools layout analysis');
  } else if (breakType === BREAK_TYPES.VALIDATION) {
    actions.push('1. Review frontend code for recent CSS/JS changes');
    actions.push('2. Check browser console for JavaScript errors');
    actions.push('3. Verify DOM selectors match current HTML structure');
  } else if (breakType === BREAK_TYPES.SUBMISSION) {
    actions.push('1. Check form validation rules and error messages');
    actions.push('2. Verify backend API endpoint is reachable');
    actions.push('3. Check for CORS or authentication failures');
  } else if (breakType === BREAK_TYPES.CONSOLE) {
    actions.push('1. Review browser console error logs');
    actions.push('2. Check for third-party script failures');
    actions.push('3. Verify API endpoints and authentication tokens');
  } else {
    actions.push('1. Check application logs for errors');
    actions.push('2. Verify all dependencies are deployed');
    actions.push('3. Check recent changes that might affect this flow');
  }

  return actions;
}

/**
 * Aggregate all failures into intelligence summary
 * @param {Array} attempts - Attempt results
 * @param {Array} flows - Flow results
 * @returns {Object} Summary with failures, by-domain counts, escalation signals
 */
function aggregateIntelligence(attempts = [], flows = []) {
  const allFailures = [];
  const byDomain = {
    [IMPACT_DOMAINS.REVENUE]: [],
    [IMPACT_DOMAINS.LEAD]: [],
    [IMPACT_DOMAINS.TRUST]: [],
    [IMPACT_DOMAINS.UX]: []
  };
  const bySeverity = {
    [SEVERITY_LEVELS.CRITICAL]: [],
    [SEVERITY_LEVELS.WARNING]: [],
    [SEVERITY_LEVELS.INFO]: []
  };

  // Analyze attempts
  for (const attempt of attempts) {
    const intel = analyzeFailure(attempt, false);
    if (intel) {
      allFailures.push(intel);
      byDomain[intel.domain].push(intel);
      bySeverity[intel.severity].push(intel);
    }
  }

  // Analyze flows (higher weight)
  for (const flow of flows) {
    const intel = analyzeFailure(flow, true);
    if (intel) {
      allFailures.push(intel);
      byDomain[intel.domain].push(intel);
      bySeverity[intel.severity].push(intel);
    }
  }

  // Escalation signals
  const escalationSignals = [];
  if (bySeverity[SEVERITY_LEVELS.CRITICAL].length > 0) {
    escalationSignals.push('CRITICAL failures detected - immediate action required');
  }
  if (byDomain[IMPACT_DOMAINS.REVENUE].length > 0) {
    escalationSignals.push('REVENUE domain affected - financial impact likely');
  }
  if (
    flows.filter(f => f.outcome === 'FAILURE').length > 0 ||
    allFailures.filter(f => f.breakType === BREAK_TYPES.NETWORK || f.breakType === BREAK_TYPES.TIMEOUT).length > 0
  ) {
    escalationSignals.push('Infrastructure/availability issue indicated');
  }

  return {
    totalFailures: allFailures.length,
    failures: allFailures,
    byDomain,
    bySeverity,
    escalationSignals,
    criticalCount: bySeverity[SEVERITY_LEVELS.CRITICAL].length,
    warningCount: bySeverity[SEVERITY_LEVELS.WARNING].length,
    infoCount: bySeverity[SEVERITY_LEVELS.INFO].length
  };
}

module.exports = {
  analyzeFailure,
  aggregateIntelligence,
  generateWhyItMatters,
  generateTopActions,
  BREAK_TYPES,
  IMPACT_DOMAINS,
  SEVERITY_LEVELS
};
