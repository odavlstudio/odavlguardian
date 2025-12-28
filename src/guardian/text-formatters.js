/**
 * Text Formatters - Single Source of Truth
 * 
 * All verdict, findings, limits, and pattern text is generated here
 * and rendered identically across CLI, HTML, JUnit, and decision.json.
 * 
 * Layer 4 / Step 4.1: Consistency Lock Across Outputs
 */

/**
 * Format verdict summary line
 */
function formatVerdictStatus(verdict) {
  if (!verdict) return 'No verdict available';
  return verdict.verdict || 'UNKNOWN';
}

/**
 * Format confidence line
 */
function formatConfidence(verdict) {
  if (!verdict || !verdict.confidence) return 'n/a';
  const cf = verdict.confidence;
  const level = cf.level || 'n/a';
  const score = typeof cf.score === 'number' ? cf.score.toFixed(2) : 'n/a';
  return `${level} (${score})`;
}

/**
 * Format verdict why
 */
function formatVerdictWhy(verdict) {
  if (!verdict || !verdict.why) return null;
  return verdict.why;
}

/**
 * Format key findings (returns array of strings)
 */
function formatKeyFindings(verdict) {
  if (!verdict || !Array.isArray(verdict.keyFindings)) return [];
  return verdict.keyFindings.slice(0, 7);
}

/**
 * Format limits (returns array of strings)
 */
function formatLimits(verdict) {
  if (!verdict || !Array.isArray(verdict.limits)) return [];
  return verdict.limits.slice(0, 6);
}

/**
 * Format pattern summary
 */
function formatPatternSummary(pattern) {
  if (!pattern) return '';
  return pattern.summary || '';
}

/**
 * Format pattern why it matters
 */
function formatPatternWhy(pattern) {
  if (!pattern) return '';
  return pattern.whyItMatters || '';
}

/**
 * Format pattern recommended focus
 */
function formatPatternFocus(pattern) {
  if (!pattern) return null;
  return pattern.recommendedFocus || null;
}

/**
 * Format pattern limits
 */
function formatPatternLimits(pattern) {
  if (!pattern) return null;
  return pattern.limits || null;
}

/**
 * Format confidence interpretation micro-line
 */
function formatConfidenceMicroLine() {
  return 'Confidence reflects the strength of evidence from outcomes, coverage, and captured artifacts.';
}

/**
 * Format first-run note
 */
function formatFirstRunNote() {
  return 'This verdict reflects this moment; repeat runs strengthen confidence.';
}

/**
 * Format journey message for run N
 */
function formatJourneyMessage(runIndex) {
  if (runIndex === 0) {
    return 'Run 1/3: establishing a baseline for this site.';
  } else if (runIndex === 1) {
    return 'Run 2/3: checking for repeat signals.';
  }
  return null;
}

/**
 * Format next-run hint
 */
function formatNextRunHint(verdict) {
  if (!verdict || !verdict.nextRunHint) return null;
  return verdict.nextRunHint;
}

/**
 * Format confidence drivers (returns array of strings)
 */
function formatConfidenceDrivers(verdict) {
  if (!verdict || !verdict.confidence || !Array.isArray(verdict.confidence.reasons)) return [];
  return verdict.confidence.reasons.slice(0, 3);
}

/**
 * Format focus summary (Layer 5 - Advisor Mode)
 * 
 * Derives prioritization from existing verdict, confidence, patterns, and limits.
 * Returns array of focus lines (max 3) — NOT advice, NOT commands, only attention priorities.
 * 
 * Display when: verdict !== READY OR confidence !== high OR patterns.length > 0
 * Suppress when: READY + high confidence + no patterns
 * 
 * Derivation logic:
 * - High-confidence patterns dominate
 * - Single point of failure outranks others
 * - Confidence degradation outranks friction
 * - Repeated "not executed" indicates coverage focus
 * - Limits provide context, not priority
 * 
 * @param {object} verdict - Verdict object
 * @param {array} patterns - Array of detected patterns (from analyzePatterns)
 * @returns {array} Array of focus lines (max 3)
 */
function formatFocusSummary(verdict, patterns = []) {
  if (!verdict) return [];
  
  const vStatus = verdict.verdict || 'UNKNOWN';
  const cfLevel = (verdict.confidence || {}).level || 'n/a';
  
  // Suppress when READY + high confidence + no patterns
  if (vStatus === 'READY' && cfLevel === 'high' && patterns.length === 0) {
    return [];
  }
  
  const focus = [];
  
  // Priority 1: Single point of failure patterns (critical blockers)
  const spofPatterns = patterns.filter(p => p.type === 'single_point_failure');
  spofPatterns.forEach(p => {
    if (focus.length >= 3) return;
    const path = p.pathName || 'a critical path';
    focus.push(`${path} is blocked and prevents user progress`);
  });
  
  // Priority 2: Confidence degradation (quality trending down)
  const degradationPatterns = patterns.filter(p => p.type === 'confidence_degradation');
  degradationPatterns.forEach(p => {
    if (focus.length >= 3) return;
    const path = p.pathName || 'flow quality';
    focus.push(`${path} declining across recent runs`);
  });
  
  // Priority 3: Recurring friction (persistent issues)
  const frictionPatterns = patterns.filter(p => p.type === 'recurring_friction');
  frictionPatterns.forEach(p => {
    if (focus.length >= 3) return;
    const path = p.pathName || 'this path';
    focus.push(`${path} experiencing repeated friction`);
  });
  
  // Priority 4: Repeated skipped/not-executed (coverage gaps)
  const skippedPatterns = patterns.filter(p => p.type === 'repeated_skipped_attempts');
  skippedPatterns.forEach(p => {
    if (focus.length >= 3) return;
    const path = p.pathName || 'path';
    focus.push(`Coverage gap: ${path} not yet exercised`);
  });
  
  // If no patterns but verdict is not READY or confidence is not high, derive from verdict
  if (focus.length === 0 && (vStatus !== 'READY' || cfLevel !== 'high')) {
    if (vStatus === 'BLOCKED') {
      focus.push('Site functionality is blocked');
    } else if (vStatus === 'FRICTION') {
      focus.push('Site experiencing friction in user flows');
    }
    
    // Add confidence-based focus if low/medium
    if (cfLevel === 'low' && focus.length < 3) {
      focus.push('Evidence strength is limited for current verdict');
    } else if (cfLevel === 'medium' && focus.length < 3) {
      focus.push('Confidence moderate; additional runs would strengthen assessment');
    }
  }
  
  return focus.slice(0, 3); // Hard limit: max 3
}

/**
 * Format delta insight (Stage V / Step 5.1)
 * 
 * Compares current run (N) vs previous run (N-1) and generates minimal delta insight:
 * - What improved
 * - What regressed
 * 
 * Max 2 lines total (1 improved + 1 regressed).
 * Suppresses if no meaningful change detected.
 * 
 * @param {object} currentVerdict - Current run verdict
 * @param {object} previousVerdict - Previous run verdict (N-1)
 * @param {array} currentPatterns - Current run patterns
 * @param {array} previousPatterns - Previous run patterns (N-1)
 * @returns {object} - { improved: string[], regressed: string[] }
 */
function formatDeltaInsight(currentVerdict, previousVerdict, currentPatterns = [], previousPatterns = []) {
  const result = { improved: [], regressed: [] };
  
  // Early return if no previous run
  if (!previousVerdict) {
    return result;
  }
  
  const currentStatus = (currentVerdict && currentVerdict.verdict) || 'UNKNOWN';
  const previousStatus = (previousVerdict && previousVerdict.verdict) || 'UNKNOWN';
  
  const currentConfLevel = (currentVerdict && currentVerdict.confidence && currentVerdict.confidence.level) || 'n/a';
  const previousConfLevel = (previousVerdict && previousVerdict.confidence && previousVerdict.confidence.level) || 'n/a';
  
  // Verdict hierarchy: READY > FRICTION > DO_NOT_LAUNCH/BLOCKED
  const verdictRank = { 'READY': 3, 'FRICTION': 2, 'DO_NOT_LAUNCH': 1, 'BLOCKED': 1, 'UNKNOWN': 0 };
  const currentRank = verdictRank[currentStatus] || 0;
  const previousRank = verdictRank[previousStatus] || 0;
  
  // Priority 1: Verdict change
  if (currentRank > previousRank) {
    result.improved.push('Overall readiness improved compared to the previous run');
  } else if (currentRank < previousRank) {
    result.regressed.push('Overall readiness declined compared to the previous run');
  }
  
  // Priority 2: Confidence level change (only if verdict didn't change)
  if (currentRank === previousRank && currentConfLevel !== previousConfLevel) {
    const confRank = { 'high': 3, 'medium': 2, 'low': 1, 'n/a': 0 };
    const currentConfRank = confRank[currentConfLevel] || 0;
    const previousConfRank = confRank[previousConfLevel] || 0;
    
    if (currentConfRank > previousConfRank && result.improved.length === 0) {
      result.improved.push('Confidence in verdict strengthened compared to the previous run');
    } else if (currentConfRank < previousConfRank && result.regressed.length === 0) {
      result.regressed.push('Confidence in verdict weakened compared to the previous run');
    }
  }
  
  // Priority 3: Pattern changes (only if no verdict or confidence change)
  if (result.improved.length === 0 && result.regressed.length === 0) {
    // Check for resolved critical patterns
    const previousCriticalPatterns = previousPatterns.filter(p => 
      p.type === 'single_point_failure' || p.severity === 'critical'
    );
    const currentCriticalPatterns = currentPatterns.filter(p => 
      p.type === 'single_point_failure' || p.severity === 'critical'
    );
    
    // Pattern resolved
    if (previousCriticalPatterns.length > 0 && currentCriticalPatterns.length === 0) {
      result.improved.push('Previously observed friction was not detected in this run');
    }
    
    // New critical pattern appeared
    if (previousCriticalPatterns.length === 0 && currentCriticalPatterns.length > 0) {
      result.regressed.push('New blocking issues were observed since the last run');
    } else if (currentCriticalPatterns.length > previousCriticalPatterns.length) {
      result.regressed.push('A recurring failure pattern emerged in this run');
    }
  }
  
  // Enforce max 2 lines total (1 improved + 1 regressed)
  return {
    improved: result.improved.slice(0, 1),
    regressed: result.regressed.slice(0, 1)
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * STAGE V / STEP 5.2: SILENCE DISCIPLINE — SUPPRESSION HELPERS
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Centralized boolean helpers to enforce strict suppression rules.
 * Guardian speaks ONLY when there is clear, meaningful value.
 * Silence is the default state. Output is an exception.
 */

/**
 * Should render Focus Summary?
 * Suppress when: verdict === READY + confidence === high + no patterns
 */
function shouldRenderFocusSummary(verdict, patterns) {
  if (!verdict) return false;
  
    // Handle null/undefined patterns: safer to show when uncertain
    if (patterns === null || patterns === undefined) {
      return true;
    }
  
  const vStatus = verdict.verdict || 'UNKNOWN';
  const cfLevel = (verdict.confidence || {}).level || 'n/a';
  
  // Suppress when READY + high confidence + no patterns
  if (vStatus === 'READY' && cfLevel === 'high' && patterns.length === 0) {
    return false;
  }
  
  return true;
}

/**
 * Should render Delta Insight?
 * Suppress when: no improved and no regressed lines
 */
function shouldRenderDeltaInsight(delta) {
  if (!delta) return false;
  return (delta.improved && delta.improved.length > 0) || (delta.regressed && delta.regressed.length > 0);
}

/**
 * Should render Observed Patterns?
 * Suppress when: no patterns detected
 */
function shouldRenderPatterns(patterns) {
  // Handle null/undefined patterns
  if (!patterns || !Array.isArray(patterns)) {
    return false;
  }
  return patterns.length > 0;
}

/**
 * Should render Confidence Drivers?
 * Suppress when: confidence === high AND runIndex >= 3
 */
function shouldRenderConfidenceDrivers(verdict, runIndex = 0) {
  if (!verdict) return false;

  const cfLevel = (verdict.confidence || {}).level || 'n/a';

  // Canonical rule: show unless confidence is high on runIndex >= 2
  if (cfLevel === 'high' && runIndex >= 2) {
    return false;
  }

  return true;
}

/**
 * Should render Three-Runs Journey messaging?
 * Suppress when: runIndex >= 3
 */
function shouldRenderJourneyMessage(runIndex = 0) {
  return runIndex < 2;
}

/**
 * Should render Next-Run Hint?
 * Suppress when: verdict === READY OR no gaps/limits exist
 */
function shouldRenderNextRunHint(verdict) {
  if (!verdict) return false;
  
  const vStatus = verdict.verdict || 'UNKNOWN';
  
  // Suppress when READY
  if (vStatus === 'READY') {
    return false;
  }
  
  // Show when not READY (hints may be valuable)
  return true;
}

/**
 * Should render First-Run Note?
 * Suppress when: runIndex >= 2
 */
function shouldRenderFirstRunNote(runIndex = 0) {
  return runIndex < 2;
}

module.exports = {
  formatVerdictStatus,
  formatConfidence,
  formatVerdictWhy,
  formatKeyFindings,
  formatLimits,
  formatPatternSummary,
  formatPatternWhy,
  formatPatternFocus,
  formatPatternLimits,
  formatConfidenceMicroLine,
  formatFirstRunNote,
  formatJourneyMessage,
  formatNextRunHint,
  formatConfidenceDrivers,
  formatFocusSummary,
  formatDeltaInsight,
  // Stage V / Step 5.2: Silence Discipline helpers
  shouldRenderFocusSummary,
  shouldRenderDeltaInsight,
  shouldRenderPatterns,
  shouldRenderConfidenceDrivers,
  shouldRenderJourneyMessage,
  shouldRenderNextRunHint,
  shouldRenderFirstRunNote
};
