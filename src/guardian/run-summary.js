function deriveBaselineVerdict({ baselineCreated, diffResult }) {
  if (baselineCreated) return 'BASELINE_CREATED';
  if (!diffResult) return 'NO_BASELINE';
  const hasRegressions = diffResult.regressions && Object.keys(diffResult.regressions).length > 0;
  const hasImprovements = diffResult.improvements && Object.keys(diffResult.improvements).length > 0;
  if (hasRegressions) return 'REGRESSION_DETECTED';
  if (hasImprovements) return 'IMPROVEMENT_DETECTED';
  return 'NO_REGRESSION';
}

function formatRunSummary({ flowResults = [], diffResult = null, baselineCreated = false, exitCode = 0 }, options = {}) {
  const success = flowResults.filter(f => f.outcome === 'SUCCESS').length;
  const friction = flowResults.filter(f => f.outcome === 'FRICTION').length;
  const failure = flowResults.filter(f => f.outcome === 'FAILURE').length;
  const baseline = deriveBaselineVerdict({ baselineCreated, diffResult });
  const label = options.label || 'Summary';
  return `${label}: flows=${flowResults.length} success=${success} friction=${friction} failure=${failure} | baseline=${baseline} | exit=${exitCode}`;
}

module.exports = { formatRunSummary, deriveBaselineVerdict };
