/**
 * Output Readability — Unified CLI Output Flow
 * 
 * Orchestrates all Guardian CLI output into a single, readable narrative.
 * Composes outputs from first-run, verdict-clarity, and error-clarity modules.
 * 
 * Stage 4 of DX BOOST
 */

const { printVerdictClarity, extractTopReasons, buildObservationClarity } = require('./verdict-clarity');
const { printErrorClarity } = require('./error-clarity');
const { printConfidenceSignals } = require('./confidence-signals');
const { formatHonestyForCLI } = require('./honesty');

/**
 * Check if unified output should be shown
 * Skip in quiet mode, CI, or non-TTY
 * 
 * @param {Object} config - Guardian config
 * @param {Array} args - CLI arguments
 * @returns {boolean}
 */
function shouldShowUnifiedOutput(config = {}, args = []) {
  if (args.includes('--quiet') || args.includes('-q')) {
    return false;
  }
  
  if (!process.stdout.isTTY) {
    return false;
  }
  
  return true;
}

/**
 * Format header section
 * 
 * @param {Object} meta - Run metadata
 * @param {Object} config - Guardian config
 * @returns {string}
 */
function formatHeader(meta = {}, config = {}) {
  const lines = [];
  
  lines.push('━'.repeat(70));
  lines.push('GUARDIAN REALITY TEST');
  lines.push('━'.repeat(70));
  lines.push('');
  lines.push(`Target: ${meta.url || 'unknown'}`);
  lines.push(`Run ID: ${meta.runId || 'unknown'}`);
  
  if (config.preset) {
    lines.push(`Preset: ${config.preset}`);
  }
  
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Format execution summary
 * 
 * @param {Object} coverage - Coverage metrics
 * @param {Object} counts - Execution counts
 * @returns {string}
 */
function formatExecutionSummary(coverage = {}, counts = {}) {
  const lines = [];
  
  const planned = coverage.total || 0;
  const executed = counts.executedCount || coverage.executed || 0;
  const skippedTotal = (coverage.skippedDisabledByPreset || []).length +
                       (coverage.skippedUserFiltered || []).length +
                       (coverage.skippedNotApplicable || []).length +
                       (coverage.skippedMissing || []).length;
  
  lines.push('EXECUTION SUMMARY');
  lines.push('─'.repeat(70));
  lines.push(`Planned:  ${planned} attempt${planned !== 1 ? 's' : ''}`);
  lines.push(`Executed: ${executed} attempt${executed !== 1 ? 's' : ''}`);
  
  if (skippedTotal > 0) {
    lines.push(`Skipped:  ${skippedTotal} attempt${skippedTotal !== 1 ? 's' : ''}`);
    
    // Brief skip summary
    const skipReasons = [];
    const disabledCount = (coverage.skippedDisabledByPreset || []).length;
    const filteredCount = (coverage.skippedUserFiltered || []).length;
    const naCount = (coverage.skippedNotApplicable || []).length;
    
    if (naCount > 0) skipReasons.push(`${naCount} not applicable`);
    if (disabledCount > 0) skipReasons.push(`${disabledCount} disabled by preset`);
    if (filteredCount > 0) skipReasons.push(`${filteredCount} user-filtered`);
    
    if (skipReasons.length > 0) {
      lines.push(`          (${skipReasons.join(', ')})`);
    }
  }
  
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Format final summary
 * 
 * @param {string} verdict - Canonical verdict
 * @param {string} reportPath - Path to artifacts
 * @param {number} exitCode - Exit code
 * @returns {string}
 */
function formatFinalSummary(verdict = 'UNKNOWN', reportPath = '', exitCode = 0) {
  const lines = [];
  
  lines.push('━'.repeat(70));
  lines.push('FINAL RECOMMENDATION');
  lines.push('━'.repeat(70));
  lines.push('');
  
  // Actionable recommendation
  let recommendation = '';
  if (verdict === 'READY') {
    recommendation = 'Site is ready for production. All critical flows passed.';
  } else if (verdict === 'FRICTION') {
    recommendation = 'Site has issues. Review failures above and fix before launch.';
  } else if (verdict === 'DO_NOT_LAUNCH') {
    recommendation = 'DO NOT LAUNCH. Critical failures detected. Investigate immediately.';
  } else {
    recommendation = 'Test completed. Review results above.';
  }
  
  lines.push(recommendation);
  lines.push('');
  
  if (reportPath) {
    lines.push(`Full report: ${reportPath}`);
  }
  
  lines.push(`Exit code: ${exitCode}`);
  lines.push('');
  lines.push('━'.repeat(70));
  
  return lines.join('\n');
}

/**
 * Print unified CLI output
 * Canonical output flow for Guardian
 * 
 * @param {Object} result - Guardian execution result
 * @param {Object} config - Guardian config
 * @param {Array} args - CLI arguments
 */
function printUnifiedOutput(result = {}, config = {}, args = []) {
  if (!shouldShowUnifiedOutput(config, args)) {
    return;
  }
  
  const {
    meta = {},
    coverage = {},
    counts = {},
    verdict = {},
    attemptResults = [],
    flowResults = [],
    exitCode = 0,
    runDir = ''
  } = result;
  
  // Extract verdict value
  const verdictValue = verdict.verdict || verdict.canonicalVerdict || 'UNKNOWN';
  const verdictSection = verdict;
  
  // 1. HEADER
  console.log('');
  console.log(formatHeader(meta, config));
  
  // 2. EXECUTION SUMMARY
  console.log(formatExecutionSummary(coverage, counts));
  
  // 3. VERDICT BLOCK (using existing verdict-clarity module)
  const topReasons = extractTopReasons(
    verdictSection,
    attemptResults || [],
    flowResults || []
  );
  const observationClarity = buildObservationClarity(
    coverage,
    attemptResults || []
  );
  
  printVerdictClarity(verdictValue, {
    reasons: topReasons,
    explanation: verdictSection.explanation,
    observed: observationClarity.observed,
    notObserved: observationClarity.notObserved,
    config,
    args
  });
  
  // 4. CONFIDENCE SIGNALS (using existing confidence-signals module)
  printConfidenceSignals({
    coverage,
    attemptResults,
    flowResults,
    verdict: verdictSection,
    counts
  }, config, args);
  
  // 5. ERROR/FAILURE DETAILS (using existing error-clarity module)
  const failures = (attemptResults || []).filter(a =>
    a.outcome === 'FAILURE' || a.outcome === 'FRICTION' || a.outcome === 'SKIPPED'
  );
  
  if (failures.length > 0) {
    printErrorClarity(failures, config, args);
  }
  
  // 5.5. HONESTY CONTRACT - Show limits of this run
  if (verdict.honestyContract) {
    console.log('');
    console.log(formatHonestyForCLI(verdict.honestyContract));
  } else {
    console.log('');
    console.log('⚠️  HONESTY DATA MISSING - Claims cannot be verified');
    console.log('');
  }
  
  // 6. FINAL SUMMARY
  const reportPath = runDir || '';
  console.log('');
  console.log(formatFinalSummary(verdictValue, reportPath, exitCode));
}

/**
 * Format compact legacy output (for fallback/quiet mode)
 * 
 * @param {Object} result - Guardian execution result
 * @returns {string}
 */
function formatCompactOutput(result = {}) {
  const { meta = {}, verdict = {}, exitCode = 0 } = result;
  const verdictValue = verdict.verdict || verdict.canonicalVerdict || 'UNKNOWN';
  
  const lines = [];
  lines.push('━'.repeat(70));
  lines.push(`Target: ${meta.url || 'unknown'}`);
  lines.push(`Verdict: ${verdictValue}`);
  lines.push(`Exit Code: ${exitCode}`);
  lines.push('━'.repeat(70));
  
  return lines.join('\n');
}

module.exports = {
  shouldShowUnifiedOutput,
  formatHeader,
  formatExecutionSummary,
  formatFinalSummary,
  printUnifiedOutput,
  formatCompactOutput
};
