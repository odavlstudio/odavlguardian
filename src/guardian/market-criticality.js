/**
 * Market Criticality Engine - Phase 3
 * 
 * Deterministic scoring of market risk:
 * - NO AI, NO GUESSING
 * - Pure heuristics based on:
 *   - Attempt type
 *   - Page context (URL patterns)
 *   - Validator outcomes
 *   - Frequency
 */

/**
 * Severity levels and ranges
 */
const SEVERITY_LEVELS = {
  INFO: { range: [0, 30], label: 'INFO' },
  WARNING: { range: [31, 70], label: 'WARNING' },
  CRITICAL: { range: [71, 100], label: 'CRITICAL' }
};

/**
 * Risk categories
 */
const RISK_CATEGORIES = {
  REVENUE: 'REVENUE',
  LEAD: 'LEAD',
  TRUST: 'TRUST/UX',
  UX: 'UX'
};

/**
 * Attempt type to category mapping
 */
const ATTEMPT_CATEGORIES = {
  contact_form: RISK_CATEGORIES.LEAD,
  newsletter_signup: RISK_CATEGORIES.LEAD,
  language_switch: RISK_CATEGORIES.TRUST,
  signup: RISK_CATEGORIES.LEAD,
  login: RISK_CATEGORIES.TRUST,
  checkout: RISK_CATEGORIES.REVENUE,
  payment: RISK_CATEGORIES.REVENUE,
  auth: RISK_CATEGORIES.TRUST,
  search: RISK_CATEGORIES.UX
};

/**
 * URL context matchers
 */
const URL_CONTEXT_PATTERNS = {
  pricing: /pricing|price|plans|payment-method/i,
  checkout: /checkout|cart|order|purchase/i,
  signup: /signup|register|join|subscribe/i,
  auth: /login|signin|logout|password/i,
  account: /account|profile|settings|dashboard/i
};

/**
 * Calculate impact score (0-100) for a single failure
 * 
 * @param {Object} input
 * @param {string} input.attemptId - attempt identifier
 * @param {string} input.category - REVENUE|LEAD|TRUST|UX
 * @param {string} input.validatorStatus - FAIL|WARN|PASS
 * @param {string} input.pageUrl - current page URL
 * @param {number} input.frequency - how many runs this appeared (default 1)
 * @returns {number} score 0-100
 */
function calculateImpactScore(input) {
  const {
    attemptId = '',
    category = RISK_CATEGORIES.UX,
    validatorStatus = 'WARN',
    pageUrl = '',
    frequency = 1
  } = input;

  let score = 0;

  // Base score from category importance
  const categoryScores = {
    [RISK_CATEGORIES.REVENUE]: 80,  // Highest: money
    [RISK_CATEGORIES.LEAD]: 60,     // Medium-high: customer acquisition
    [RISK_CATEGORIES.TRUST]: 50,    // Medium: user trust
    [RISK_CATEGORIES.UX]: 30        // Lower: convenience
  };
  score += categoryScores[category] || 30;

  // Validator outcome multiplier
  if (validatorStatus === 'FAIL') {
    score += 15; // Explicit failure
  } else if (validatorStatus === 'WARN') {
    score += 8;  // Warning flag
  }

  // URL context boost: if on critical pages, increase weight
  const urlContext = detectUrlContext(pageUrl);
  if (urlContext === 'checkout' && category === RISK_CATEGORIES.REVENUE) {
    score += 10;
  } else if (urlContext === 'signup' && category === RISK_CATEGORIES.LEAD) {
    score += 8;
  } else if (urlContext === 'auth' && category === RISK_CATEGORIES.TRUST) {
    score += 8;
  }

  // Frequency multiplier: if this appears multiple times, escalate
  // But cap at reasonable level
  const frequencyMultiplier = Math.min(frequency, 3);
  score = Math.round(score * (1 + (frequencyMultiplier - 1) * 0.15));

  // Cap at 100
  return Math.min(100, Math.max(0, score));
}

/**
 * Determine severity level from impact score
 * @param {number} impactScore - 0-100
 * @returns {string} INFO|WARNING|CRITICAL
 */
function getSeverityFromScore(impactScore) {
  if (impactScore >= SEVERITY_LEVELS.CRITICAL.range[0]) {
    return SEVERITY_LEVELS.CRITICAL.label;
  } else if (impactScore >= SEVERITY_LEVELS.WARNING.range[0]) {
    return SEVERITY_LEVELS.WARNING.label;
  }
  return SEVERITY_LEVELS.INFO.label;
}

/**
 * Detect URL context pattern
 * @param {string} url
 * @returns {string|null} context type or null
 */
function detectUrlContext(url) {
  for (const [context, pattern] of Object.entries(URL_CONTEXT_PATTERNS)) {
    if (pattern.test(url)) {
      return context;
    }
  }
  return null;
}

/**
 * Analyze all attempts and extract market impact risks
 * 
 * @param {Array} attempts - array of attempt execution results
 * @param {string} baseUrl - base URL being tested
 * @param {Object} frequencyMap - map of attemptId -> count (optional)
 * @returns {Object} marketImpactSummary with risks and counts
 */
function analyzeMarketImpact(attempts, baseUrl, frequencyMap = {}) {
  const risks = [];
  const countsBySeverity = {
    CRITICAL: 0,
    WARNING: 0,
    INFO: 0
  };

  for (const attempt of attempts) {
    // Skip successful attempts
    if (attempt.outcome === 'SUCCESS') {
      continue;
    }

    const attemptId = attempt.attemptId;
    const attemptCategory = ATTEMPT_CATEGORIES[attemptId] || RISK_CATEGORIES.UX;
    const frequency = frequencyMap[attemptId] || 1;

    // Check if has validator failures
    if (attempt.validators && Array.isArray(attempt.validators)) {
      for (const validator of attempt.validators) {
        if (validator.status === 'FAIL' || validator.status === 'WARN') {
          const impactScore = calculateImpactScore({
            attemptId,
            category: attemptCategory,
            validatorStatus: validator.status,
            pageUrl: attempt.pageUrl || baseUrl,
            frequency
          });

          const severity = getSeverityFromScore(impactScore);
          countsBySeverity[severity]++;

          risks.push({
            attemptId,
            validatorId: validator.id,
            validatorType: validator.type,
            category: attemptCategory,
            severity,
            impactScore,
            humanReadableReason: generateRiskDescription(
              attemptId,
              validator.id,
              validator.message,
              attemptCategory,
              severity
            )
          });
        }
      }
    }

    // Check friction signals
    if (attempt.friction && attempt.friction.signals && Array.isArray(attempt.friction.signals)) {
      for (const signal of attempt.friction.signals) {
        const impactScore = calculateImpactScore({
          attemptId,
          category: attemptCategory,
          validatorStatus: 'WARN',
          pageUrl: attempt.pageUrl || baseUrl,
          frequency
        });

        const severity = getSeverityFromScore(impactScore);
        countsBySeverity[severity]++;

        risks.push({
          attemptId,
          validatorId: signal.id,
          validatorType: 'friction',
          category: attemptCategory,
          severity,
          impactScore,
          humanReadableReason: generateRiskDescription(
            attemptId,
            signal.id,
            signal.description,
            attemptCategory,
            severity
          )
        });
      }
    }

    // Check outcome-based risk
    if (attempt.outcome === 'FAILURE') {
      const impactScore = calculateImpactScore({
        attemptId,
        category: attemptCategory,
        validatorStatus: 'FAIL',
        pageUrl: attempt.pageUrl || baseUrl,
        frequency
      });

      const severity = getSeverityFromScore(impactScore);
      countsBySeverity[severity]++;

      risks.push({
        attemptId,
        validatorId: `outcome_${attemptId}`,
        validatorType: 'outcome',
        category: attemptCategory,
        severity,
        impactScore,
        humanReadableReason: `${attemptId} attempt FAILED - user could not complete goal`
      });
    }
  }

  // Sort by impact score (highest first)
  risks.sort((a, b) => b.impactScore - a.impactScore);

  // Determine highest severity
  let highestSeverity = 'INFO';
  if (countsBySeverity.CRITICAL > 0) {
    highestSeverity = 'CRITICAL';
  } else if (countsBySeverity.WARNING > 0) {
    highestSeverity = 'WARNING';
  }

  return {
    highestSeverity,
    topRisks: risks.slice(0, 10), // Top 10 risks
    countsBySeverity,
    totalRiskCount: risks.length,
    allRisks: risks
  };
}

/**
 * Generate human-readable description of a risk
 * @param {string} attemptId
 * @param {string} validatorId
 * @param {string} validatorMessage
 * @param {string} category
 * @param {string} severity
 * @returns {string}
 */
function generateRiskDescription(attemptId, validatorId, validatorMessage, category, severity) {
  const categoryLabel = category === RISK_CATEGORIES.REVENUE ? '💰 Revenue' :
                       category === RISK_CATEGORIES.LEAD ? '👥 Lead Gen' :
                       category === RISK_CATEGORIES.TRUST ? '🔒 Trust' :
                       '⚙️ UX';

  return `${categoryLabel}: ${attemptId} - ${validatorMessage}`;
}

/**
 * Determine if severity has escalated between runs
 * Used to decide exit codes
 * 
 * @param {string} previousSeverity - INFO|WARNING|CRITICAL
 * @param {string} currentSeverity - INFO|WARNING|CRITICAL
 * @returns {Object} { escalated: boolean, severity: 0|1|2 }
 */
function determineExitCodeFromEscalation(previousSeverity, currentSeverity) {
  const severityRank = {
    INFO: 0,
    WARNING: 1,
    CRITICAL: 2
  };

  const prevRank = severityRank[previousSeverity] || 0;
  const currRank = severityRank[currentSeverity] || 0;

  return {
    escalated: currRank > prevRank,
    severity: currRank,
    previousSeverity,
    currentSeverity
  };
}

module.exports = {
  SEVERITY_LEVELS,
  RISK_CATEGORIES,
  ATTEMPT_CATEGORIES,
  URL_CONTEXT_PATTERNS,
  calculateImpactScore,
  getSeverityFromScore,
  detectUrlContext,
  analyzeMarketImpact,
  generateRiskDescription,
  determineExitCodeFromEscalation
};
