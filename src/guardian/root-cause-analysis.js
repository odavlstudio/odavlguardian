/**
 * Phase 4 — Root-Cause Analysis
 * Deterministically derive hints from failure evidence
 */

const { BREAK_TYPES } = require('./failure-taxonomy');

/**
 * Extract hints from step execution failure
 * @param {Object} step - { type, target, status, error, duration }
 * @returns {string[]} Array of hint strings
 */
function hintsFromStep(step) {
  const hints = [];

  if (!step) return hints;

  const error = (step.error || '').toLowerCase();
  const type = step.type || '';

  // Navigation
  if (type === 'navigate' && error.includes('timeout')) {
    hints.push('Server not responding or slow to load');
  } else if (type === 'navigate' && error.includes('failed')) {
    hints.push('Navigation failed; verify base URL is correct');
  }

  // Click failures
  if (type === 'click') {
    if (error.includes('selector') || error.includes('found')) {
      hints.push(`Element selector not found: ${step.target}`);
    } else if (error.includes('visible')) {
      hints.push(`Element not visible or clickable: ${step.target}`);
    } else if (error.includes('timeout')) {
      hints.push(`Timeout clicking ${step.target}; page may be loading slowly`);
    }
  }

  // Type failures
  if (type === 'type') {
    if (error.includes('selector') || error.includes('found')) {
      hints.push(`Input field not found: ${step.target}`);
    } else if (error.includes('timeout')) {
      hints.push(`Timeout typing into ${step.target}; page lag detected`);
    }
  }

  // WaitFor failures
  if (type === 'waitFor') {
    if (error.includes('timeout')) {
      hints.push(`Success element never appeared: ${step.target}`);
      hints.push('Submission may have silently failed or redirected');
    }
  }

  // Submit failures
  if (type === 'submit') {
    hints.push('Form submission did not complete; check form validation');
  }

  return hints;
}

/**
 * Extract hints from validator results
 * @param {Array} validators - Array of { type, status, message, evidence }
 * @returns {string[]} Array of hint strings
 */
function hintsFromValidators(validators) {
  const hints = [];

  if (!Array.isArray(validators)) return hints;

  for (const v of validators) {
    if (v.status === 'FAIL') {
      if (v.type === 'elementVisible') {
        hints.push(`Expected element not visible: ${v.evidence?.selector}`);
      } else if (v.type === 'pageContainsAnyText') {
        hints.push(`Page text check failed; expected one of: ${v.evidence?.searchTerms?.join(', ')}`);
      } else if (v.type === 'elementContainsText') {
        hints.push(`Element text mismatch; expected: ${v.evidence?.expectedText}`);
      } else if (v.type === 'htmlLangAttribute') {
        hints.push(`HTML lang attribute unexpected; expected: ${v.evidence?.expected}`);
      } else if (v.type === 'urlIncludes' || v.type === 'urlMatches') {
        hints.push(`URL does not match expected pattern: ${v.evidence?.pattern || v.evidence?.expected}`);
      } else {
        hints.push(`Validator failed: ${v.type}`);
      }
    }
  }

  return hints;
}

/**
 * Extract hints from friction signals
 * @param {Array} signals - Array of { id, description, threshold, observedValue }
 * @returns {string[]} Array of hint strings
 */
function hintsFromFriction(signals) {
  const hints = [];

  if (!Array.isArray(signals)) return hints;

  for (const sig of signals) {
    if (sig.id === 'slow_step_execution') {
      hints.push(`Step took ${sig.observedValue}ms (threshold ${sig.threshold}ms); network or page lag`);
    } else if (sig.id === 'multiple_retries_required') {
      hints.push(`Step needed ${sig.observedValue} retries; interaction unreliable`);
    } else if (sig.id === 'slow_total_duration') {
      hints.push(`Total attempt took ${sig.observedValue}ms; slow server response`);
    }
  }

  return hints;
}

/**
 * Derive root-cause hints from complete failure evidence
 * @param {Object} failure - Attempt or flow result
 * @param {string} breakType - BREAK_TYPE
 * @returns {Object} { hints: string[], primaryHint: string }
 */
function deriveRootCauseHints(failure, breakType) {
  const allHints = new Set();

  // Step-level evidence
  if (failure.steps && Array.isArray(failure.steps)) {
    const failedStep = failure.steps.find(s => s.status === 'failed');
    if (failedStep) {
      hintsFromStep(failedStep).forEach(h => allHints.add(h));
    }
  }

  // Validator evidence
  if (failure.validators) {
    hintsFromValidators(failure.validators).forEach(h => allHints.add(h));
  }

  // Friction signals
  if (failure.friction && failure.friction.signals) {
    hintsFromFriction(failure.friction.signals).forEach(h => allHints.add(h));
  }

  // Fallback hints by break type
  if (allHints.size === 0) {
    const fallbacks = {
      [BREAK_TYPES.NAVIGATION]: 'Server unreachable or incorrect URL',
      [BREAK_TYPES.SUBMISSION]: 'Form submission did not complete',
      [BREAK_TYPES.VALIDATION]: 'Success validation did not pass',
      [BREAK_TYPES.TIMEOUT]: 'Step timed out; slow response or missing element',
      [BREAK_TYPES.VISUAL]: 'Expected element not found on page',
      [BREAK_TYPES.CONSOLE]: 'Console error prevented progress',
      [BREAK_TYPES.NETWORK]: 'Network error or lost connection'
    };
    allHints.add(fallbacks[breakType] || 'Unknown failure');
  }

  const hints = Array.from(allHints);
  return {
    hints,
    primaryHint: hints[0] || 'Unknown failure'
  };
}

module.exports = {
  deriveRootCauseHints,
  hintsFromStep,
  hintsFromValidators,
  hintsFromFriction
};
