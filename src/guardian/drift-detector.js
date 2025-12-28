/**
 * Drift Detection Engine for Journey Results
 * Deterministic comparison against stored baseline snapshot.
 */

function buildBaselineFromJourneyResult(result) {
  const keySteps = (result.executedSteps || []).map(s => ({ id: s.id, success: !!s.success }));
  const baseline = {
    decision: result.finalDecision,
    intent: (result.intentDetection && result.intentDetection.intent) || 'unknown',
    goalReached: !!(result.goal && result.goal.goalReached),
    keySteps,
    timestamp: new Date().toISOString()
  };
  return baseline;
}

function compareAgainstBaseline(baseline, current) {
  const reasons = [];
  const currentSteps = {};
  (current.executedSteps || []).forEach(s => { currentSteps[s.id] = !!s.success; });

  // Decision drift
  const before = baseline.decision;
  const after = current.finalDecision;
  if (before === 'SAFE' && (after === 'RISK' || after === 'DO_NOT_LAUNCH')) {
    reasons.push(`Decision regressed: ${before} → ${after}`);
  }

  // Goal drift
  const baselineGoal = !!baseline.goalReached;
  const currentGoal = !!(current.goal && current.goal.goalReached);
  if (baselineGoal && !currentGoal) {
    reasons.push('Visitors can no longer reach goal');
  }

  // Intent drift
  const baselineIntent = (baseline.intent || 'unknown').toLowerCase();
  const currentIntent = ((current.intentDetection && current.intentDetection.intent) || 'unknown').toLowerCase();
  if (baselineIntent !== 'unknown' && currentIntent !== 'unknown' && baselineIntent !== currentIntent) {
    reasons.push(`Site intent changed from ${baselineIntent.toUpperCase()} to ${currentIntent.toUpperCase()}`);
  }

  // Critical step regression: any step that succeeded before now fails
  for (const ks of baseline.keySteps || []) {
    if (ks.success === true) {
      const now = currentSteps[ks.id];
      if (now === false || now === undefined) {
        reasons.push(`Critical step failed: ${ks.id}`);
      }
    }
  }

  return {
    hasDrift: reasons.length > 0,
    reasons: reasons
  };
}

function classifySeverity(driftInfo, currentResult) {
  if (!driftInfo || !driftInfo.hasDrift) return 'NONE';
  
  const reasons = driftInfo.reasons || [];
  
  // CRITICAL conditions:
  // 1. Decision drifted to DO_NOT_LAUNCH
  if (currentResult.decision === 'DO_NOT_LAUNCH') {
    // Exception: if run stability is very low (<50), downgrade to WARN
    // unless site is unreachable
    if (!reasons.some(r => r.includes('SITE_UNREACHABLE'))) {
      const stabilityScore = currentResult.stability?.runStabilityScore || 100;
      if (stabilityScore < 50) {
        return 'WARN'; // Downgrade: unstable run, re-check recommended
      }
    }
    return 'CRITICAL';
  }
  
  // 2. Site unreachable - always CRITICAL (do not downgrade)
  if (reasons.some(r => r.includes('SITE_UNREACHABLE'))) return 'CRITICAL';
  
  // 3. Goal drift (visitors can no longer reach goal)
  if (reasons.some(r => r.includes('goal drift: true → false'))) {
    // Check stability before deciding
    const stabilityScore = currentResult.stability?.runStabilityScore || 100;
    if (stabilityScore < 50) {
      return 'WARN'; // Downgrade: unstable, suspicious drift
    }
    return 'CRITICAL';
  }
  
  // Default: WARN for all other drift
  return 'WARN';
}

module.exports = {
  buildBaselineFromJourneyResult,
  compareAgainstBaseline,
  classifySeverity
};
