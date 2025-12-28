/**
// STRICT CLI SUMMARY: factual, artifact-traceable lines only
function generateCliSummary(snapshot, policyEval, baselineCheckResult, options = {}) {
  if (!snapshot) return 'No snapshot data available.';
  const meta = snapshot.meta || {};
  const coverage = snapshot.coverage || {};
  const counts = coverage.counts || {};
  const evidence = snapshot.evidenceMetrics || {};
  const resolved = snapshot.resolved || {};

  let output = '\n';
  output += '━'.repeat(70) + '\n';
  output += '🛡️  Guardian Reality Summary\n';
  output += '━'.repeat(70) + '\n\n';

  output += `Target: ${meta.url || 'unknown'}\n`;
  output += `Run ID: ${meta.runId || 'unknown'}\n\n`;

  const pe = snapshot.policyEvaluation || {};
  output += `Policy Verdict: ${meta.result || (pe.passed ? 'PASSED' : pe.exitCode === 2 ? 'WARN' : 'FAILED')}\n`;
  output += `Exit Code: ${pe.exitCode ?? 'unknown'}\n`;

  const planned = coverage.total ?? (resolved.coverage?.total) ?? 'unknown';
  const executed = counts.executedCount ?? (resolved.coverage?.executedCount) ?? coverage.executed ?? 'unknown';
  output += `Executed / Planned: ${executed} / ${planned}\n`;

  const completeness = evidence.completeness ?? resolved.evidenceMetrics?.completeness ?? 'unknown';
  const integrity = evidence.integrity ?? resolved.evidenceMetrics?.integrity ?? 'unknown';
  output += `Coverage Completeness: ${typeof completeness === 'number' ? completeness.toFixed(4) : completeness}\n`;
  output += `Evidence Integrity: ${typeof integrity === 'number' ? integrity.toFixed(4) : integrity}\n`;

  if (meta.attestation?.hash) {
    output += `Attestation: ${meta.attestation.hash}\n`;
  // STRICT CLI SUMMARY: factual, artifact-traceable lines only
  function generateCliSummary(snapshot, policyEval, baselineCheckResult, options = {}) {
    if (!snapshot) return 'No snapshot data available.';
    const meta = snapshot.meta || {};
    const coverage = snapshot.coverage || {};
    const counts = coverage.counts || {};
    const evidence = snapshot.evidenceMetrics || {};
    const resolved = snapshot.resolved || {};

    let output = '\n';
    output += '━'.repeat(70) + '\n';
    output += '🛡️  Guardian Reality Summary\n';
    output += '━'.repeat(70) + '\n\n';

    output += `Target: ${meta.url || 'unknown'}\n`;
    output += `Run ID: ${meta.runId || 'unknown'}\n\n`;

    const pe = snapshot.policyEvaluation || {};
    output += `Policy Verdict: ${meta.result || (pe.passed ? 'PASSED' : pe.exitCode === 2 ? 'WARN' : 'FAILED')}\n`;
    output += `Exit Code: ${pe.exitCode ?? 'unknown'}\n`;

    const planned = coverage.total ?? (resolved.coverage?.total) ?? 'unknown';
    const executed = counts.executedCount ?? (resolved.coverage?.executedCount) ?? coverage.executed ?? 'unknown';
    output += `Executed / Planned: ${executed} / ${planned}\n`;

    const completeness = evidence.completeness ?? resolved.evidenceMetrics?.completeness ?? 'unknown';
    const integrity = evidence.integrity ?? resolved.evidenceMetrics?.integrity ?? 'unknown';
    output += `Coverage Completeness: ${typeof completeness === 'number' ? completeness.toFixed(4) : completeness}\n`;
    output += `Evidence Integrity: ${typeof integrity === 'number' ? integrity.toFixed(4) : integrity}\n`;

    if (meta.attestation?.hash) {
      output += `Attestation: ${meta.attestation.hash}\n`;
    }

    // Audit Summary
    const executedAttempts = (snapshot.attempts || []).filter(a => a.executed).map(a => a.attemptId);
    output += '\nAudit Summary:\n';
    output += `  Tested (${executedAttempts.length}): ${executedAttempts.join(', ') || 'none'}\n`;
    const skippedDisabled = (coverage.skippedDisabledByPreset || []).map(s => s.attempt);
    const skippedUserFiltered = (coverage.skippedUserFiltered || []).map(s => s.attempt);
    const skippedNotApplicable = (coverage.skippedNotApplicable || []).map(s => s.attempt);
    const skippedMissing = (coverage.skippedMissing || []).map(s => s.attempt);
    output += `  Not Tested — DisabledByPreset (${skippedDisabled.length}): ${skippedDisabled.join(', ') || 'none'}\n`;
    output += `  Not Tested — UserFiltered (${skippedUserFiltered.length}): ${skippedUserFiltered.join(', ') || 'none'}\n`;
    output += `  Not Tested — NotApplicable (${skippedNotApplicable.length}): ${skippedNotApplicable.join(', ') || 'none'}\n`;
    output += `  Not Tested — Missing (${skippedMissing.length}): ${skippedMissing.join(', ') || 'none'}\n`;

    const reasons = Array.isArray(pe.reasons) ? pe.reasons : [];
    if (reasons.length > 0) {
      output += '\nPolicy Reasons:\n';
      reasons.forEach(r => {
        if (typeof r === 'string') output += `  • ${r}\n`; else if (r.message) output += `  • ${r.message}\n`; else output += `  • ${JSON.stringify(r)}\n`;
      });
    }

    output += '\n📁 Full report: ' + (meta.runId ? `artifacts/${meta.runId}/` : 'See artifacts/') + '\n\n';
    output += '━'.repeat(70) + '\n';
    return output;
  }
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
function printCliSummary(snapshot, policyEval, baselineCheckResult, options = {}) {
  const summary = generateCliSummary(snapshot, policyEval, baselineCheckResult, options);
  console.log(summary);
}

module.exports = {
  generateCliSummary,
  printCliSummary
};
