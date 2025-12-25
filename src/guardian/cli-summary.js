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
 * @param {object} baselineCheckResult - Optional baseline check result
 * @returns {string} Formatted CLI summary
 */
function generateCliSummary(snapshot, policyEval, baselineCheckResult) {
  if (!snapshot) {
    return 'No snapshot data available.';
  }

  const meta = snapshot.meta || {};
  const marketImpact = snapshot.marketImpactSummary || {};
  const intelligence = snapshot.intelligence || {};
  // Prefer deterministic counts from breakage intelligence (attempts + flows)
  const failures = Array.isArray(intelligence.failures) ? intelligence.failures : [];
  const counts = {
    CRITICAL: failures.filter(f => f.severity === 'CRITICAL').length,
    WARNING: failures.filter(f => f.severity === 'WARNING').length,
    INFO: failures.filter(f => f.severity === 'INFO').length
  };
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
  if (counts.CRITICAL > 0) {
    // Derive domain strictly from the highest-severity risk item (first CRITICAL failure)
    const severityOrder = { CRITICAL: 3, WARNING: 2, INFO: 1 };
    const topCritical = [...failures]
      .filter(f => f.severity === 'CRITICAL')
      .sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0))[0];
    if (topCritical && topCritical.domain) {
      const labelMap = { REVENUE: 'Revenue impact', LEAD: 'Lead gen impact', TRUST: 'Trust/security', UX: 'User experience' };
      const domainLabel = labelMap[topCritical.domain] || 'Impact detected';
      output += ` (${domainLabel})`;
    }
  }
  output += '\n';
  output += `  ⚠️  WARNING:  ${counts.WARNING}`;
  if (counts.WARNING > 0) output += ' (Potential UX impact)';
  output += '\n';
  output += `  ℹ️  INFO:     ${counts.INFO}`;
  if (counts.INFO > 0) output += ' (Minor issues)';
  output += '\n\n';

  // Top Risks (up to 3)
  // Top Issues (strict separation of attempts vs flows)
  const severityOrderTI = { CRITICAL: 3, WARNING: 2, INFO: 1 };
  const topIssues = [...failures]
    .sort((a, b) => (severityOrderTI[b.severity] || 0) - (severityOrderTI[a.severity] || 0))
    .slice(0, 3);
  if (topIssues.length > 0) {
    output += '🔥 Top Issues:\n';
    topIssues.forEach((issue, idx) => {
      const tag = issue.source === 'flow' ? '[FLOW]' : '[ATTEMPT]';
      const status = issue.outcome === 'FAILURE' ? 'FAILED' : (issue.outcome || 'ISSUE');
      const title = issue.name || issue.id || 'Unknown';
      output += `   ${idx + 1}. ${tag} ${title} ${status}\n`;
      // Include one-line reason for extra clarity
      const reason = issue.primaryHint || issue.hints?.[0] || '';
      if (reason) {
        output += `      Reason: ${reason}\n`;
      }
    });
    output += '\n';
  }

  // Attempt Summary
  // Phase 7.4: Include SKIPPED in summary
  const successfulAttempts = attempts.filter(a => a.outcome === 'SUCCESS').length;
  const skippedAttempts = attempts.filter(a => a.outcome === 'SKIPPED').length;
  const totalAttempts = attempts.length;
  if (totalAttempts > 0) {
    output += '🎯 Attempts:\n';
    output += `   ${successfulAttempts}/${totalAttempts} successful`;
    if (successfulAttempts < totalAttempts) {
      const failed = totalAttempts - successfulAttempts - skippedAttempts;
      if (failed > 0) output += ` (${failed} failed)`;
      if (skippedAttempts > 0) output += ` (${skippedAttempts} skipped)`;
    }
    output += '\n\n';
  }

  // Flow Submit Outcomes (Wave 1.3)
  const flows = snapshot.flows || [];
  const flowsWithEval = flows.filter(f => f.successEval);
  if (flowsWithEval.length > 0) {
    output += '🚦 Submit Outcomes:\n';
    flowsWithEval.slice(0, 5).forEach(f => {
      const status = (f.successEval.status || 'unknown').toUpperCase();
      const confidence = f.successEval.confidence || 'low';
      output += `   ${f.flowName}: ${status} (confidence: ${confidence})\n`;
      const reasons = (f.successEval.reasons || []).slice(0, 3);
      if (reasons.length) {
        output += '     Reasons:\n';
        reasons.forEach(r => { output += `       - ${r}\n`; });
      }
      // Compact evidence summary
      const ev = f.successEval.evidence || {};
      const net = Array.isArray(ev.network) ? ev.network : [];
      const primary = net.find(n => (n.method === 'POST' || n.method === 'PUT') && n.status != null) || net[0];
      const reqLine = (() => {
        if (!primary) return null;
        try { const p = new URL(primary.url); return `request: ${primary.method} ${p.pathname} → ${primary.status}`; }
        catch { return `request: ${primary.method} ${primary.url} → ${primary.status}`; }
      })();
      const navLine = ev.urlChanged ? (() => {
        try { const from = new URL(snapshot.meta.url).pathname; const to = ''; return `navigation: changed`; }
        catch { return `navigation: changed`; }
      })() : null;
      const formStates = [];
      if (ev.formCleared) formStates.push('cleared');
      if (ev.formDisabled) formStates.push('disabled');
      if (ev.formDisappeared) formStates.push('disappeared');
      const formLine = formStates.length ? `form: ${formStates.join(', ')}` : null;
      const evidenceLines = [reqLine, navLine, formLine].filter(Boolean);
      if (evidenceLines.length) {
        output += '     Evidence:\n';
        evidenceLines.slice(0, 2).forEach(line => { output += `       - ${line}\n`; });
      }
    });
    output += '\n';
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

  // Baseline Comparison (Phase 3.2)
  if (baselineCheckResult) {
    const verdict = baselineCheckResult.overallRegressionVerdict || 'NO_BASELINE';
    
    if (verdict === 'NO_BASELINE') {
      output += '📊 Baseline Comparison: not found (no comparison)\n\n';
    } else if (verdict === 'BASELINE_UNUSABLE') {
      output += '📊 Baseline Comparison: unusable (skipped)\n\n';
    } else {
      const emoji = verdict === 'NO_REGRESSION' ? '✅' : 
                    verdict === 'REGRESSION_FRICTION' ? '🟡' :
                    '🔴';
      
      output += '📊 Baseline Comparison:\n';
      output += `   ${emoji} ${verdict.replace(/_/g, ' ')}\n`;
      
      // Show per-attempt changes
      const comparisons = baselineCheckResult.comparisons || [];
      const regressions = comparisons.filter(c => c.regressionType !== 'NO_REGRESSION');
      const improvements = comparisons.filter(c => c.improvements && c.improvements.length > 0);
      
      if (regressions.length > 0) {
        output += '   \n';
        output += '   Regressions detected:\n';
        regressions.slice(0, 3).forEach(r => {
          const label = r.attemptId || 'unknown';
          const type = r.regressionType.replace(/_/g, ' ');
          const reasons = r.regressionReasons.slice(0, 1).join('; ') || 'See report';
          output += `     • ${label}: ${type}\n`;
          output += `       ${reasons}\n`;
        });
        if (regressions.length > 3) {
          output += `     ... and ${regressions.length - 3} more regressions\n`;
        }
      }
      
      if (improvements.length > 0) {
        output += '   \n';
        output += '   Improvements detected:\n';
        improvements.slice(0, 3).forEach(i => {
          const label = i.attemptId || 'unknown';
          const improvementText = i.improvements.slice(0, 1).join('; ') || 'Improved';
          output += `     • ${label}: ${improvementText}\n`;
        });
        if (improvements.length > 3) {
          output += `     ... and ${improvements.length - 3} more improvements\n`;
        }
      }
      
      // Show per-flow changes
      const flowComparisons = baselineCheckResult.flowComparisons || [];
      const flowRegressions = flowComparisons.filter(c => c.regressionType !== 'NO_REGRESSION');
      
      if (flowRegressions.length > 0) {
        output += '   \n';
        output += '   Flow regressions:\n';
        flowRegressions.forEach(f => {
          const label = f.flowId || 'unknown';
          const type = f.regressionType.replace(/_/g, ' ');
          output += `     • ${label}: ${type}\n`;
        });
      }
      
      output += '\n';
    }
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
function printCliSummary(snapshot, policyEval, baselineCheckResult) {
  const summary = generateCliSummary(snapshot, policyEval, baselineCheckResult);
  console.log(summary);
}

module.exports = {
  generateCliSummary,
  printCliSummary
};
