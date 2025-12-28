/**
 * Stability Scorer - Real-world reliability metrics
 * 
 * Measures how stable a journey run was:
 * - Per-step stability (transient vs deterministic failures)
 * - Overall run stability score (0-100)
 */

/**
 * Classify error type for determining if it's transient or deterministic
 * @param {string} errorMessage - Error message from step
 * @returns {object} - { isTransient: boolean, classification: string }
 */
function classifyErrorType(errorMessage) {
  if (!errorMessage) return { isTransient: false, classification: 'UNKNOWN' };

  const msg = errorMessage.toLowerCase();

  // Transient errors (safe to retry)
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return { isTransient: true, classification: 'TIMEOUT' };
  }
  if (msg.includes('navigation') && (msg.includes('timeout') || msg.includes('closed'))) {
    return { isTransient: true, classification: 'NAVIGATION_TIMEOUT' };
  }
  if (msg.includes('detached') || msg.includes('frame')) {
    return { isTransient: true, classification: 'DETACHED_FRAME' };
  }
  if (msg.includes('econnrefused') || msg.includes('network') || msg.includes('socket')) {
    return { isTransient: true, classification: 'NETWORK_ERROR' };
  }
  if (msg.includes('connection') && (msg.includes('reset') || msg.includes('closed'))) {
    return { isTransient: true, classification: 'CONNECTION_ERROR' };
  }

  // Deterministic errors (don't retry)
  if (msg.includes('not found') && (msg.includes('cta') || msg.includes('element'))) {
    return { isTransient: false, classification: 'ELEMENT_NOT_FOUND' };
  }
  if (msg.includes('not visible')) {
    return { isTransient: false, classification: 'ELEMENT_NOT_VISIBLE' };
  }
  if (msg.includes('cta') && msg.includes('found')) {
    return { isTransient: false, classification: 'CTA_NOT_FOUND' };
  }

  // Default: assume transient to be safe
  return { isTransient: true, classification: 'UNKNOWN' };
}

/**
 * Compute stability score for a single step
 * @param {object} step - Executed step result { id, name, success, attemptNumber, error }
 * @returns {object} - { attempts, finalStatus, stable, confidence, errorType }
 */
function scoreStepStability(step) {
  const attempts = step.attemptNumber || 1;
  const finalStatus = step.success ? 'SUCCESS' : 'FAILED';
  const errorType = classifyErrorType(step.error);

  // Determine stability
  let stable = true;
  let confidence = 100;

  if (finalStatus === 'SUCCESS') {
    if (attempts > 1) {
      // Success after retries = transient failure
      stable = true; // The step ultimately worked
      confidence = Math.max(30, 100 - (attempts - 1) * 20);
    }
  } else {
    // Step failed all retries
    stable = false;
    confidence = 10; // Very low confidence in a consistently failing step
  }

  return {
    stepId: step.id,
    attempts,
    finalStatus,
    stable,
    confidence,
    errorType: errorType.classification,
    isTransient: errorType.isTransient
  };
}

/**
 * Compute overall run stability score (0-100)
 * @param {object} result - Journey result with executedSteps array
 * @returns {number} - Stability score 0-100
 */
function computeRunStabilityScore(result) {
  const steps = result.executedSteps || [];

  if (steps.length === 0) return 0;

  // Calculate step-level stability
  const stepScores = steps.map(scoreStepStability);

  // Count how many steps needed retries
  const stepsWithRetries = stepScores.filter(s => s.attempts > 1).length;
  const failedSteps = stepScores.filter(s => s.finalStatus === 'FAILED').length;

  // Scoring algorithm:
  // - Start at 100
  // - Deduct 10 points per step that needed retries
  // - Deduct 30 points per failed step
  // - Floor at 0
  let score = 100;
  score -= stepsWithRetries * 10;
  score -= failedSteps * 30;
  score = Math.max(0, score);

  // Consistency check: if goalReached varies, reduce score
  // (This is a simple heuristic; more complex consistency checks could be added)
  const hasInconsistency = false; // Would need multiple runs to detect
  if (hasInconsistency) {
    score = Math.max(0, score - 20);
  }

  return Math.round(score);
}

/**
 * Build stability report from journey result
 * @param {object} result - Journey scan result
 * @returns {object} - Stability report with scores and metrics
 */
function buildStabilityReport(result) {
  const steps = result.executedSteps || [];
  const stepStability = steps.map(scoreStepStability);
  const runScore = computeRunStabilityScore(result);

  const metrics = {
    totalSteps: steps.length,
    succeededSteps: stepStability.filter(s => s.finalStatus === 'SUCCESS').length,
    failedSteps: stepStability.filter(s => s.finalStatus === 'FAILED').length,
    stepsWithRetries: stepStability.filter(s => s.attempts > 1).length,
    totalAttempts: stepStability.reduce((sum, s) => sum + s.attempts, 0)
  };

  return {
    runStabilityScore: runScore,
    metrics,
    stepStability,
    assessment: assessStability(runScore)
  };
}

/**
 * Assess stability level based on score
 * @param {number} score - Stability score 0-100
 * @returns {string} - Assessment: 'excellent' | 'good' | 'fair' | 'poor'
 */
function assessStability(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

module.exports = {
  classifyErrorType,
  scoreStepStability,
  computeRunStabilityScore,
  buildStabilityReport,
  assessStability
};
