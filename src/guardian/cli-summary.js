/**
 * CLI Summary Module
 * 
 * Generate human-friendly CLI summaries at the end of Guardian runs.
 * Shows critical info, top risks, and actionable next steps.
 */

/**
 * Generate final CLI summary
 * @param {object} snapshot - Guardian snapshot
 * @param {object} policyEval - Policy evaluation result
 * @returns {string} Formatted CLI summary
 */
function generateCliSummary(snapshot, policyEval) {
  if (!snapshot) {
    return 'No snapshot data available.';
  }

  const meta = snapshot.meta || {};
  const marketImpact = snapshot.marketImpactSummary || {};
  const counts = marketImpact.countsBySeverity || { CRITICAL: 0, WARNING: 0, INFO: 0 };
  const topRisks = marketImpact.topRisks || [];
  const attempts = snapshot.attempts || [];
  const discovery = snapshot.discovery || {};

  let output = '\n';
  output += '━'.repeat(70) + '\n';
  output += '🛡️  Guardian Reality Summary\n';
  output += '━'.repeat(70) + '\n\n';

  // Target URL
  output += `Target: ${meta.url || 'unknown'}\n`;
  output += `Run ID: ${meta.runId || 'unknown'}\n\n`;

  // Risk Counts
  output += '📊 Risk Summary:\n';
  output += `  🚨 CRITICAL: ${counts.CRITICAL}`;
  if (counts.CRITICAL > 0) output += ' (Revenue impact)';
  output += '\n';
  output += `  ⚠️  WARNING:  ${counts.WARNING}`;
  if (counts.WARNING > 0) output += ' (User experience)';
  output += '\n';
  output += `  ℹ️  INFO:     ${counts.INFO}`;
  if (counts.INFO > 0) output += ' (Minor issues)';
  output += '\n\n';

  // Top Risks (up to 3)
  if (topRisks.length > 0) {
    // Preserve legacy label for backward compatibility
    output += '🔥 Top Risk:\n';
    // New: compact list of top 3 issues
    output += '   (Top Issues)\n';
    topRisks.slice(0, 3).forEach((risk, idx) => {
      output += `   ${idx + 1}. ${risk.humanReadableReason || 'Unknown issue'}\n`;
      output += `      Impact: ${risk.impactScore || 0} (${risk.category || 'UNKNOWN'}) | Severity: ${risk.severity || 'INFO'}\n`;
    });

    // Link evidence if available for the top-most
    const topRisk = topRisks[0];
    const relatedAttempt = attempts.find(a => 
      a.attemptId === topRisk.attemptId || 
      (topRisk.humanReadableReason || '').toLowerCase().includes(a.attemptName?.toLowerCase() || '')
    );
    if (relatedAttempt && relatedAttempt.evidence) {
      output += `   Evidence: ${relatedAttempt.evidence.screenshotPath || 'See report'}\n`;
    }
    output += '\n';
  }

  // Attempt Summary
  const successfulAttempts = attempts.filter(a => a.outcome === 'SUCCESS').length;
  const totalAttempts = attempts.length;
  if (totalAttempts > 0) {
    output += '🎯 Attempts:\n';
    output += `   ${successfulAttempts}/${totalAttempts} successful`;
    if (successfulAttempts < totalAttempts) {
      output += ` (${totalAttempts - successfulAttempts} failed)`;
    }
    output += '\n\n';
  }

  // Discovery Summary
  if (discovery.pagesVisitedCount > 0) {
    output += '🔍 Discovery:\n';
    output += `   Pages visited: ${discovery.pagesVisitedCount || 0}\n`;
    output += `   Interactions discovered: ${discovery.interactionsDiscovered || 0}\n`;
    output += `   Interactions executed: ${discovery.interactionsExecuted || 0}\n\n`;
  }

  // Policy Evaluation
  if (policyEval) {
    output += '🛡️  Policy:\n';
    if (policyEval.passed) {
      output += '   ✅ PASSED - All checks satisfied\n';
    } else {
      output += '   ❌ FAILED - Policy violations detected\n';
      if (policyEval.reasons && policyEval.reasons.length > 0) {
        output += '   Reasons:\n';
        policyEval.reasons.slice(0, 3).forEach(reason => {
          output += `     • ${reason}\n`;
        });
      }
    }
    output += `   Exit code: ${policyEval.exitCode || 0}\n\n`;
  }

  // Next Action
  output += '👉 Next Action:\n';
  if (counts.CRITICAL > 0) {
    output += '   ⚠️  Fix the CRITICAL issue(s) before deploying.\n';
    output += '   Review the top risk above and check evidence screenshots.\n';
  } else if (counts.WARNING > 0) {
    output += '   ⚠️  Review WARNING issues - they may impact user experience.\n';
    output += '   Consider fixing before next release.\n';
  } else if (policyEval && !policyEval.passed) {
    output += '   ⚠️  Policy check failed. Review policy violations above.\n';
  } else {
    output += '   ✅ All checks passed! Site is ready for deployment.\n';
  }

  output += '\n';
  output += '📁 Full report: ' + (meta.runId ? `artifacts/${meta.runId}/` : 'See artifacts/\n');
  output += '\n';

  output += '━'.repeat(70) + '\n';

  return output;
}

/**
 * Print summary to console
 */
function printCliSummary(snapshot, policyEval) {
  const summary = generateCliSummary(snapshot, policyEval);
  console.log(summary);
}

module.exports = {
  generateCliSummary,
  printCliSummary
};
