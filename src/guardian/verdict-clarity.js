/**
 * Verdict Clarity — Human-Readable Verdict Output
 * 
 * Formats verdicts with clear actions, top reasons, and observation clarity.
 * Production-grade DX improvement for CLI output.
 */

/**
 * Check if output should be shown
 * Skip in quiet, CI, or non-TTY environments
 * 
 * @param {Object} config - Guardian config
 * @param {Array} args - CLI arguments
 * @returns {boolean} true if should show verdict clarity
 */
function shouldShowVerdictClarity(config = {}, args = []) {
  // Skip if --quiet or -q flag
  if (args.includes('--quiet') || args.includes('-q')) {
    return false;
  }

  // Skip if non-TTY (CI/automation without explicit output)
  if (!process.stdout.isTTY) {
    return false;
  }

  return true;
}

/**
 * Get one-line human explanation for verdict
 * 
 * @param {string} verdict - READY, FRICTION, or DO_NOT_LAUNCH
 * @returns {string} Human explanation
 */
function getVerdictExplanation(verdict) {
  switch (String(verdict || '').toUpperCase()) {
    case 'READY':
      return 'All core user flows completed successfully. Safe to launch.';
    case 'FRICTION':
      return 'Some user flows encountered issues. Launch with caution.';
    case 'DO_NOT_LAUNCH':
      return 'Critical issues found. Do not launch until resolved.';
    default:
      return 'Verdict unclear. Review full report for details.';
  }
}

/**
 * Get action hint for verdict
 * 
 * @param {string} verdict - READY, FRICTION, or DO_NOT_LAUNCH
 * @returns {string} Action hint
 */
function getActionHint(verdict) {
  switch (String(verdict || '').toUpperCase()) {
    case 'READY':
      return 'Safe to launch';
    case 'FRICTION':
      return 'Launch with caution';
    case 'DO_NOT_LAUNCH':
      return 'Do not launch';
    default:
      return 'Review details';
  }
}

/**
 * Extract top reasons from verdict data
 * Up to 3 reasons from: rules triggered, failures, near-success, skipped critical flows
 * 
 * @param {Object} verdict - Verdict object with reasons and findings
 * @param {Array} attempts - Attempt results
 * @param {Array} flows - Flow results
 * @returns {Array} Top reasons (max 3)
 */
function extractTopReasons(verdict = {}, attempts = [], flows = []) {
  const reasons = [];

  // Priority 1: Rules engine reasons (all of them)
  if (verdict.triggeredRules && verdict.triggeredRules.length > 0) {
    verdict.triggeredRules.forEach(rule => {
      if (reasons.length < 3) {
        reasons.push(rule);
      }
    });
  }

  // Priority 2: Critical failures (if room)
  if (reasons.length < 3) {
    const failedAttempts = (attempts || []).filter(a => a.outcome === 'FAILURE');
    if (failedAttempts.length > 0) {
      reasons.push(`${failedAttempts.length} critical flow(s) failed`);
    }
  }

  // Priority 3: Friction signals (if room)
  if (reasons.length < 3) {
    const frictionAttempts = (attempts || []).filter(a => a.outcome === 'FRICTION');
    if (frictionAttempts.length > 0) {
      reasons.push(`${frictionAttempts.length} flow(s) with friction signals`);
    }
  }

  // Priority 4: Keyfindings (if room)
  if (reasons.length < 3 && verdict.keyFindings && verdict.keyFindings.length > 0) {
    const finding = verdict.keyFindings[0];
    if (finding && !reasons.includes(finding)) {
      reasons.push(finding);
    }
  }

  return reasons.slice(0, 3);
}

/**
 * Build observation clarity section
 * Shows what was observed and what was not, with brief reasons
 * 
 * @param {Object} coverage - Coverage metrics
 * @param {Array} attempts - Attempt results
 * @returns {Object} { observed, notObserved } objects
 */
function buildObservationClarity(coverage = {}, attempts = []) {
  const executedAttempts = (attempts || []).filter(a => a.executed);
  const observedCount = executedAttempts.length;

  const skipReasons = {
    disabledByPreset: (coverage.skippedDisabledByPreset || []).length,
    userFiltered: (coverage.skippedUserFiltered || []).length,
    notApplicable: (coverage.skippedNotApplicable || []).length,
    missing: (coverage.skippedMissing || []).length
  };

  const notObservedCount = Object.values(skipReasons).reduce((a, b) => a + b, 0);

  // Extract key attempt names if available
  const keyAttempts = executedAttempts
    .slice(0, 3)
    .map(a => a.attemptName || a.attemptId || 'unknown')
    .filter(Boolean);

  return {
    observed: {
      count: observedCount,
      examples: keyAttempts
    },
    notObserved: {
      count: notObservedCount,
      reasons: skipReasons
    }
  };
}

/**
 * Format verdict clarity block for CLI output
 * Professional, concise, no emojis or ASCII art
 * 
 * @param {string} verdict - READY, FRICTION, or DO_NOT_LAUNCH
 * @param {Object} data - { reasons, explanation, observed, notObserved, config, args }
 * @returns {string} Formatted verdict clarity block
 */
function formatVerdictClarity(verdict, data = {}) {
  const {
    reasons = [],
    explanation = '',
    observed = {},
    notObserved = {},
    config = {},
    args = []
  } = data;

  if (!shouldShowVerdictClarity(config, args)) {
    return '';
  }

  const verdictStr = String(verdict || '').toUpperCase();
  const actionHint = getActionHint(verdictStr);
  const verdictExpl = getVerdictExplanation(verdictStr);

  const lines = [];

  // Verdict Summary Block
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('VERDICT');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push(`Status: ${verdictStr}`);
  lines.push(`Meaning: ${verdictExpl}`);
  lines.push(`Action: ${actionHint}`);
  lines.push('');

  // Top Reasons (if available)
  const topReasons = reasons.filter(r => r && String(r).trim().length > 0).slice(0, 3);
  if (topReasons.length > 0) {
    lines.push('Top Reasons');
    lines.push('────────────────────────────────────────────────────────────');
    topReasons.forEach((reason, idx) => {
      lines.push(`${idx + 1}. ${reason}`);
    });
    lines.push('');
  } else {
    lines.push('Guardian did not find enough evidence to confirm success.');
    lines.push('');
  }

  // Observation Clarity
  if (observed && observed.count !== undefined) {
    lines.push('What Was Observed');
    lines.push('────────────────────────────────────────────────────────────');
    lines.push(`${observed.count} user flow(s) executed successfully`);
    if (observed.examples && observed.examples.length > 0) {
      lines.push(`Key flows: ${observed.examples.join(', ')}`);
    }
    lines.push('');
  }

  if (notObserved && notObserved.count !== undefined && notObserved.count > 0) {
    lines.push('What Was NOT Observed');
    lines.push('────────────────────────────────────────────────────────────');
    const reasonLabels = [];
    if (notObserved.reasons.disabledByPreset > 0) {
      reasonLabels.push(`${notObserved.reasons.disabledByPreset} disabled by preset`);
    }
    if (notObserved.reasons.userFiltered > 0) {
      reasonLabels.push(`${notObserved.reasons.userFiltered} user-filtered`);
    }
    if (notObserved.reasons.notApplicable > 0) {
      reasonLabels.push(`${notObserved.reasons.notApplicable} not applicable`);
    }
    if (notObserved.reasons.missing > 0) {
      reasonLabels.push(`${notObserved.reasons.missing} missing`);
    }
    lines.push(`${notObserved.count} flow(s) not observed: ${reasonLabels.join(', ')}`);
    lines.push('');
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  return lines.join('\n');
}

/**
 * Get next action for verdict (Canonical Launch Path)
 * 
 * @param {string} verdict - READY, FRICTION, or DO_NOT_LAUNCH
 * @returns {string} Next action
 */
function getNextAction(verdict) {
  switch (String(verdict || '').toUpperCase()) {
    case 'READY':
      return 'Deploy';
    case 'FRICTION':
      return 'Review';
    case 'DO_NOT_LAUNCH':
      return 'Fix before launch';
    default:
      return 'Review full report';
  }
}

/**
 * Print verdict clarity block to stdout
 * Integrates with Guardian execution flow
 * 
 * @param {string} verdict - READY, FRICTION, or DO_NOT_LAUNCH
 * @param {Object} data - Verdict data { reasons, explanation, observed, notObserved, config, args }
 */
function printVerdictClarity(verdict, data = {}) {
  const output = formatVerdictClarity(verdict, data);
  if (output && output.trim().length > 0) {
    console.log(output);
  }
  
  // Canonical Launch Path (CLP): Always print 3-line summary
  const verdictStr = String(verdict || '').toUpperCase();
  const explanation = getVerdictExplanation(verdictStr);
  const nextAction = getNextAction(verdictStr);
  
  console.log('CANONICAL SUMMARY');
  console.log(`Verdict: ${verdictStr}`);
  console.log(`Reason: ${explanation}`);
  console.log(`Next: ${nextAction}`);
  console.log('');
}

module.exports = {
  shouldShowVerdictClarity,
  getVerdictExplanation,
  getActionHint,
  getNextAction,
  extractTopReasons,
  buildObservationClarity,
  formatVerdictClarity,
  printVerdictClarity
};
