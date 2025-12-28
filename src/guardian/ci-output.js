const { formatRunSummary, deriveBaselineVerdict } = require('./run-summary');
const MAX_REASONS_DEFAULT = 3;

function pickReason(flow) {
  if (Array.isArray(flow.failureReasons) && flow.failureReasons.length > 0) {
    return flow.failureReasons[0];
  }
  if (flow.error) return flow.error;
  if (flow.successEval && Array.isArray(flow.successEval.reasons) && flow.successEval.reasons.length > 0) {
    return flow.successEval.reasons[0];
  }
  return 'no reason captured';
}

function formatCiSummary({ flowResults = [], diffResult = null, baselineCreated = false, exitCode = 0, maxReasons = MAX_REASONS_DEFAULT }) {
  const lines = [];
  lines.push('CI MODE: ON');
  lines.push(formatRunSummary({ flowResults, diffResult, baselineCreated, exitCode }, { label: 'Summary' }));

  const verdict = exitCode === 0 ? 'OBSERVED' : exitCode === 1 ? 'PARTIAL' : 'INSUFFICIENT_DATA';
  lines.push(`Result: ${verdict}`);

  if (exitCode !== 0) {
    lines.push('Observed issues:');
    const troubled = flowResults.filter(f => f.outcome === 'FAILURE' || f.outcome === 'FRICTION');
    troubled.slice(0, maxReasons).forEach(flow => {
      const reason = pickReason(flow);
      lines.push(` - ${flow.flowName || flow.flowId || 'flow'}: ${flow.outcome} | ${reason}`);
    });
    if (troubled.length > maxReasons) {
      lines.push(` - … ${troubled.length - maxReasons} more issues`);
    }
  }

  return lines.join('\n');
}

module.exports = { formatCiSummary, deriveBaselineVerdict };
