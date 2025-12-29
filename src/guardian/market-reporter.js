const fs = require('fs');
const path = require('path');
const { aggregateIntelligence } = require('./breakage-intelligence');

class MarketReporter {
  createReport(runMeta) {
    const { runId, baseUrl, attemptsRun, results, flows = [] } = runMeta;
    const timestamp = new Date().toISOString();

    const summary = this._buildSummary(results);

    const flowSummary = {
      total: flows.length,
      success: flows.filter(f => f.outcome === 'SUCCESS').length,
      failure: flows.filter(f => f.outcome === 'FAILURE').length
    };

    // Phase 2: Separate manual and auto-generated attempts
    const manualResults = results.filter(r => r.source !== 'auto-generated');
    const autoResults = results.filter(r => r.source === 'auto-generated');

    // Phase 4: Breakage intelligence
    const intelligence = aggregateIntelligence(results, flows);

    return {
      version: '1.0.0',
      runId,
      timestamp,
      baseUrl,
      attemptsRun,
      summary,
      flows,
      flowSummary,
      results,
      manualResults,
      autoResults,
      intelligence
    };
  }

  saveJsonReport(report, artifactsDir) {
    const reportPath = path.join(artifactsDir, 'market-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    return reportPath;
  }

  generateHtmlReport(report) {
    const { summary, results, runId, baseUrl, attemptsRun, timestamp, manualResults = [], autoResults = [], flows = [], flowSummary = { total: 0, success: 0, failure: 0 }, intelligence = {} } = report;
    const { toCanonicalVerdict } = require('./verdicts');
    const overallCanonical = toCanonicalVerdict(summary.overallVerdict);
    const verdictColor = overallCanonical === 'READY' ? '#10b981'
      : overallCanonical === 'FRICTION' ? '#f59e0b'
      : '#ef4444';
    const verdictEmoji = overallCanonical === 'READY' ? '🟢' : overallCanonical === 'FRICTION' ? '🟡' : '🔴';

    // Phase 5: Generate Executive Summary
    const executiveSummary = this._generateExecutiveSummary(intelligence, results, flows);

    const attemptsRows = results.map((result, idx) => {
      const { toCanonicalVerdict } = require('./verdicts');
      const canon = toCanonicalVerdict(result.outcome);
      const color = canon === 'READY' ? '#10b981' : canon === 'FRICTION' ? '#f59e0b' : '#ef4444';
      const badge = canon === 'READY' ? '✅ READY' : canon === 'FRICTION' ? '⚠️ FRICTION' : '❌ DO_NOT_LAUNCH';
      const frictionSignals = result.friction && result.friction.signals ? result.friction.signals : [];
      const sourceLabel = result.source === 'auto-generated' ? ' 🤖' : '';
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${result.attemptId}${sourceLabel}</td>
          <td>${result.attemptName || ''}</td>
          <td><span class="badge" style="background:${color}">${badge}</span></td>
          <td>${result.totalDurationMs || 0} ms</td>
          <td>${frictionSignals.length}</td>
          <td>
            ${result.reportHtmlPath ? `<a href="${path.basename(result.reportHtmlPath)}" target="_blank">HTML</a>` : ''}
            ${result.reportJsonPath ? ` | <a href="${path.basename(result.reportJsonPath)}" target="_blank">JSON</a>` : ''}
          </td>
        </tr>
      `;
    }).join('');

    const attemptDetails = results.map((result, idx) => {
      const frictionSignals = result.friction && result.friction.signals ? result.friction.signals : [];
      const frictionHtml = frictionSignals.length > 0 ? `
        <div class="friction-block">
          <h4>Friction Signals (${frictionSignals.length})</h4>
          ${frictionSignals.map(signal => {
            const severity = signal.severity || 'medium';
            const severityLabel = severity.toUpperCase();
            return `
              <div class="signal-card severity-${severity}">
                <div class="signal-header">
                  <span class="signal-id">${signal.id}</span>
                  <span class="signal-severity severity-${severity}">${severityLabel}</span>
                </div>
                <p class="signal-description">${signal.description}</p>
                <div class="signal-metrics">
                  <div class="signal-metric"><strong>Metric:</strong> ${signal.metric}</div>
                  <div class="signal-metric"><strong>Threshold:</strong> ${signal.threshold}</div>
                  <div class="signal-metric"><strong>Observed:</strong> ${signal.observedValue}</div>
                  ${signal.affectedStepId ? `<div class="signal-metric"><strong>Affected Step:</strong> ${signal.affectedStepId}</div>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : '<p class="no-friction">No friction signals</p>';

      const stepsList = (result.steps || []).map(step => `<li>${step.id} — ${step.status} (${step.durationMs || 0}ms)</li>`).join('');

      return `
        <details open>
          <summary>Attempt ${idx + 1}: ${result.attemptId} — ${result.outcome}</summary>
          <div class="attempt-detail">
            <p><strong>Outcome:</strong> ${result.outcome}</p>
            <p><strong>Duration:</strong> ${result.totalDurationMs || 0}ms</p>
            <p><strong>Friction Summary:</strong> ${result.friction && result.friction.summary ? result.friction.summary : 'None'}</p>
            ${frictionHtml}
            <div class="steps-block">
              <h4>Steps</h4>
              <ol>${stepsList}</ol>
            </div>
          </div>
        </details>
      `;
    }).join('');

    const flowRows = flows.map((flow, idx) => {
      const { toCanonicalVerdict } = require('./verdicts');
      const canon = toCanonicalVerdict(flow.outcome);
      const color = canon === 'READY' ? '#10b981' : canon === 'FRICTION' ? '#f59e0b' : '#ef4444';
      const badge = canon === 'READY' ? '✅ READY' : canon === 'FRICTION' ? '⚠️ FRICTION' : '❌ DO_NOT_LAUNCH';
      const evalSummary = flow.successEval ? (() => {
        const reasons = (flow.successEval.reasons || []).slice(0, 3).map(r => `• ${r}`).join('<br/>');
        const ev = flow.successEval.evidence || {};
        const net = Array.isArray(ev.network) ? ev.network : [];
        const primary = net.find(n => (n.method === 'POST' || n.method === 'PUT') && n.status != null) || net[0];
        const reqLine = primary ? (() => { try { const p = new URL(primary.url); return `${primary.method} ${p.pathname} → ${primary.status}`; } catch { return `${primary.method} ${primary.url} → ${primary.status}`; } })() : null;
        const navLine = ev.urlChanged ? 'navigation: changed' : null;
        const formStates = [];
        if (ev.formCleared) formStates.push('cleared');
        if (ev.formDisabled) formStates.push('disabled');
        if (ev.formDisappeared) formStates.push('disappeared');
        const formLine = formStates.length ? `form: ${formStates.join(', ')}` : null;
        const evidences = [reqLine, navLine, formLine].filter(Boolean).map(e => `• ${e}`).join('<br/>' );
        return `<div><strong>Reasons:</strong><br/>${reasons || '—'}<br/><strong>Evidence:</strong><br/>${evidences || '—'}</div>`;
      })() : '';
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${flow.flowId}</td>
          <td>${flow.flowName || ''}</td>
          <td><span class="badge" style="background:${color}">${badge}</span></td>
          <td>${flow.stepsExecuted || 0}/${flow.stepsTotal || 0}</td>
          <td>${flow.error || evalSummary || ''}</td>
        </tr>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Market Reality Report</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f6f7fb; color: #1f2937; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #111827, #1f2937); color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px; }
    .header h1 { margin: 0 0 8px 0; }
    .badge { color: white; padding: 6px 10px; border-radius: 999px; font-size: 0.9em; }
    .verdict { display: inline-flex; align-items: center; gap: 8px; background: ${verdictColor}; color: white; padding: 10px 14px; border-radius: 999px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.08); }
    th, td { padding: 12px 14px; border-bottom: 1px solid #e5e7eb; text-align: left; }
    th { background: #f3f4f6; font-weight: 600; }
    tr:last-child td { border-bottom: none; }
    details { background: white; padding: 14px; border-radius: 10px; margin-top: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.06); }
    summary { cursor: pointer; font-weight: 600; }
    .attempt-detail { margin-top: 10px; }
    .friction-block { margin: 10px 0; }
    .signal-card { background: #fefce8; border: 1px solid #fde047; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 10px; margin-bottom: 10px; }
    .signal-card.severity-low { background: #f0f9ff; border-color: #7dd3fc; border-left-color: #0ea5e9; display: none; }
    .show-low-severity .signal-card.severity-low { display: block; }
    .signal-card.severity-medium { background: #fefce8; border-color: #fde047; border-left-color: #f59e0b; }
    .signal-card.severity-high { background: #fef2f2; border-color: #fca5a5; border-left-color: #ef4444; }
    .signal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .signal-id { font-family: monospace; font-weight: 700; }
    .signal-severity { padding: 3px 8px; border-radius: 4px; color: white; font-size: 0.8em; }
    .signal-severity.severity-low { background: #0ea5e9; }
    .signal-severity.severity-medium { background: #f59e0b; }
    .signal-severity.severity-high { background: #ef4444; }
    .signal-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 6px; font-size: 0.9em; }
    .signal-metric { background: #fff; border: 1px solid #e5e7eb; border-radius: 4px; padding: 6px; }
    .steps-block ol { padding-left: 20px; }
    .no-friction { color: #16a34a; font-weight: 600; }
    .meta { display: flex; gap: 18px; margin-top: 10px; color: #e5e7eb; font-size: 0.95em; }
    /* Phase 5: Executive Summary Styles */
    .executive-summary { background: linear-gradient(135deg, #ffffff, #f8fafc); border: 3px solid #3b82f6; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .executive-summary h2 { color: #1e40af; margin: 0 0 20px 0; font-size: 28px; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; }
    .exec-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 20px; }
    .exec-card { background: white; border-radius: 8px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-left: 4px solid #3b82f6; }
    .exec-card h3 { color: #374151; margin: 0 0 12px 0; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
    .exec-verdict { font-size: 24px; font-weight: bold; margin: 8px 0; }
    .exec-verdict.safe { color: #10b981; }
    .exec-verdict.caution { color: #f59e0b; }
    .exec-verdict.danger { color: #ef4444; }
    .exec-score { font-size: 48px; font-weight: bold; color: #3b82f6; margin: 8px 0; }
    .exec-score-label { color: #6b7280; font-size: 14px; }
    .exec-risk-list { list-style: none; padding: 0; margin: 0; }
    .exec-risk-item { background: #f9fafb; border-left: 3px solid #ef4444; padding: 10px 12px; margin-bottom: 10px; border-radius: 4px; }
    .exec-risk-item .risk-title { font-weight: 600; color: #111827; margin-bottom: 4px; }
    .exec-risk-item .risk-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: white; }
    .exec-risk-item .risk-why-matters { color: #6b7280; font-size: 13px; margin-top: 6px; line-height: 1.4; font-style: italic; }
    .exec-risk-item .risk-badge.CRITICAL { background: #dc2626; }
    .exec-risk-item .risk-badge.WARNING { background: #f59e0b; }
    .exec-risk-item .risk-badge.INFO { background: #3b82f6; }
    .exec-action { background: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 16px; margin-top: 16px; }
    .exec-action h3 { color: #1e40af; margin: 0 0 10px 0; font-size: 16px; }
    .exec-action p { color: #1f2937; font-size: 15px; font-weight: 500; margin: 0; line-height: 1.5; }
    /* Phase 5 (Part 3): Noise Reduction - Collapsible Sections */
    .collapsible-section { background: white; border: 1px solid #e5e7eb; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.06); overflow: hidden; }
    .collapsible-section[open] { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .section-toggle { cursor: pointer; padding: 16px; font-weight: 600; color: #1f2937; display: flex; align-items: center; gap: 8px; user-select: none; font-size: 15px; }
    .section-toggle:hover { background: #f9fafb; }
    .collapsible-content { padding: 16px; border-top: 1px solid #e5e7eb; display: none; }
    .collapsible-section[open] .collapsible-content { display: block; }
    .collapsible-section details { margin-top: 12px; }
    .collapsible-section details summary { cursor: pointer; padding: 8px; font-weight: 500; color: #374151; user-select: none; }
    .collapsible-section details summary:hover { background: #f3f4f6; border-radius: 4px; }
    .collapsible-section table { margin-bottom: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Market Reality Report</h1>
      <div class="verdict">${verdictEmoji} ${overallCanonical}</div>
      <div class="meta">
        <div><strong>Run ID:</strong> ${runId}</div>
        <div><strong>Base URL:</strong> ${baseUrl}</div>
        <div><strong>Attempts:</strong> ${attemptsRun.join(', ')}</div>
        <div><strong>Manual:</strong> ${manualResults.length} | <strong>Auto:</strong> ${autoResults.length} 🤖</div>
        <div><strong>Flows:</strong> ${flowSummary.total} (✅ ${flowSummary.success} / ❌ ${flowSummary.failure})</div>
        <div><strong>Timestamp:</strong> ${timestamp}</div>
      </div>
    </div>

    <!-- Phase 5: Executive Summary -->
    <div class="executive-summary">
      <h2>🧠 Executive Summary</h2>
      <div class="exec-grid">
        <div class="exec-card">
          <h3>Release Verdict</h3>
          <div class="exec-verdict ${executiveSummary.verdictClass}">${executiveSummary.verdict}</div>
        </div>
        <div class="exec-card">
          <h3>Overall Risk Score</h3>
          <div class="exec-score">${executiveSummary.riskScore}</div>
          <div class="exec-score-label">/ 100</div>
        </div>
      </div>
      <div class="exec-card">
        <h3>Top Reason</h3>
        <p style="color: #1f2937; font-size: 15px; margin: 0;">${executiveSummary.topReason}</p>
      </div>
      ${executiveSummary.topRisks.length > 0 ? `
      <div class="exec-card" style="margin-top: 20px;">
        <h3>Top 3 Risks</h3>
        <ul class="exec-risk-list">
          ${executiveSummary.topRisks.map(risk => `
            <li class="exec-risk-item">
              <div class="risk-title">${risk.title}</div>
              <span class="risk-badge ${risk.severity}">${risk.severity}</span>
              <div class="risk-why-matters">Why this matters: ${risk.whyMatters}</div>
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}
      <div class="exec-action">
        <h3>📋 Recommended Next Action</h3>
        <p>${executiveSummary.nextAction}</p>
      </div>
    </div>

    <details class="collapsible-section">
      <summary class="section-toggle">📋 Attempt Details (${results.length} runs)</summary>
      <div class="collapsible-content">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Attempt ID</th>
              <th>Name</th>
              <th>Outcome</th>
              <th>Duration</th>
              <th>Friction Signals</th>
              <th>Reports</th>
            </tr>
          </thead>
          <tbody>
            ${attemptsRows}
          </tbody>
        </table>

        <div class="details">${attemptDetails}</div>
      </div>
    </details>

    ${flows.length ? `
    <details class="collapsible-section">
      <summary class="section-toggle">🔄 Intent Flows (${flows.length})</summary>
      <div class="collapsible-content">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Flow ID</th>
              <th>Name</th>
              <th>Outcome</th>
              <th>Steps</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            ${flowRows}
          </tbody>
        </table>
      </div>
    </details>
    ` : ''}

    ${intelligence && intelligence.totalFailures > 0 ? `
    <details class="collapsible-section" open>
      <summary class="section-toggle">🔍 Breakage Intelligence</summary>
      <div class="collapsible-content">
        <div style="background:#fff; padding:16px; border-radius:10px; margin-top:12px;">
          <p><strong>Critical Failures:</strong> ${intelligence.criticalCount} | <strong>Warnings:</strong> ${intelligence.warningCount} | <strong>Info:</strong> ${intelligence.infoCount}</p>
          ${intelligence.escalationSignals.length ? `
          <div style="background:#fef2f2; border:1px solid #fca5a5; padding:10px; border-radius:6px; margin-top:8px;">
            <strong>⚠️ Escalation Signals:</strong>
            <ul>
              ${intelligence.escalationSignals.map(s => `<li>${s}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
          ${intelligence.failures && intelligence.failures.slice(0, 5).map(f => `
          <details style="margin-top:10px;">
            <summary><strong>${f.name}</strong> — ${f.breakType} (${f.severity})</summary>
            <div style="margin-top:8px; padding:8px; background:#f9fafb;">
              <p><strong>Primary Hint:</strong> ${f.primaryHint}</p>
              <p><strong>Why It Matters:</strong></p>
              <ul>${f.whyItMatters.map(w => `<li>${w}</li>`).join('')}</ul>
              <p><strong>Top Actions:</strong></p>
              <ol>${f.topActions.map(a => `<li>${a}</li>`).join('')}</ol>
              ${f.breakType === 'VISUAL' && f.visualDiff ? `
              <div style="margin-top:12px; padding:8px; background:#fef3c7; border:1px solid #fbbf24; border-radius:6px;">
                <p><strong>📊 Visual Regression Details:</strong></p>
                <ul>
                  <li><strong>Change Detected:</strong> ${f.visualDiff.hasDiff ? 'YES ⚠️' : 'NO ✅'}</li>
                  <li><strong>Diff Magnitude:</strong> ${(f.visualDiff.percentChange || 0).toFixed(1)}%</li>
                  ${f.visualDiff.reason ? `<li><strong>Reason:</strong> ${f.visualDiff.reason}</li>` : ''}
                  ${f.visualDiff.diffRegions && f.visualDiff.diffRegions.length > 0 ? `<li><strong>Changed Regions:</strong> ${f.visualDiff.diffRegions.join(', ')}</li>` : ''}
                </ul>
              </div>
              ` : ''}
              ${f.behavioralSignals ? `
              <div style="margin-top:12px; padding:8px; background:#e0f2fe; border:1px solid #06b6d4; border-radius:6px;">
                <p><strong>🎯 Behavioral Signals:</strong></p>
                <ul>
                  ${f.behavioralSignals.map(sig => `<li><strong>${sig.type}:</strong> ${sig.status === 'VISIBLE' ? '✅' : '❌'} ${sig.description}</li>`).join('')}
                </ul>
              </div>
              ` : ''}
            </div>
          </details>
          `).join('')}
        </div>
      </div>
    </details>
    ` : ''}
  </div>
</body>
</html>`;
  }

  saveHtmlReport(html, artifactsDir) {
    const htmlPath = path.join(artifactsDir, 'market-report.html');
    fs.writeFileSync(htmlPath, html, 'utf8');
    return htmlPath;
  }

  /**
   * Phase 5 (Part 2): Generate human-readable business impact explanation
   * @private
   */
  _generateWhyMattersExplanation(breakType, domain) {
    // Priority 1: Break type specific impacts
    if (breakType === 'SUBMISSION') {
      return 'Users cannot complete forms or checkout, causing direct revenue or lead loss.';
    }
    if (breakType === 'NAVIGATION') {
      return 'Users may get stuck or lost, increasing abandonment rates.';
    }
    if (breakType === 'TIMEOUT') {
      return 'Slow or unresponsive pages reduce trust and increase bounce rate.';
    }
    if (breakType === 'VISUAL') {
      return 'Broken UI elements reduce credibility and user confidence.';
    }
    if (breakType === 'NETWORK') {
      return 'Environment issues may break the site only in production.';
    }
    if (breakType === 'CONSOLE') {
      return 'JavaScript errors may degrade functionality and user experience.';
    }
    if (breakType === 'VALIDATION') {
      return 'Form validation failures prevent users from completing critical actions.';
    }
    
    // Priority 2: Domain-specific fallbacks
    if (domain === 'REVENUE') {
      return 'Critical checkout or payment issues directly impact business revenue.';
    }
    if (domain === 'LEAD') {
      return 'Signup or contact form issues prevent capturing customer interest.';
    }
    if (domain === 'TRUST') {
      return 'Authentication or security issues erode user trust and safety.';
    }
    if (domain === 'UX') {
      return 'User experience degradation may increase frustration and churn.';
    }
    
    // Default fallback
    return 'Critical functionality may be broken, impacting user satisfaction.';
  }

  /**
   * Phase 5 (Part 3): Group similar issues by severity and type
   * @private
   */
  _groupSimilarIssues(failures) {
    const groups = {};
    
    for (const failure of failures) {
      const severity = failure.severity || 'INFO';
      const breakType = failure.breakType || 'UNKNOWN';
      const key = `${severity}_${breakType}`;
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(failure);
    }
    
    return groups;
  }

  /**
   * Phase 5: Generate Executive Summary data
   * @private
   */
  _generateExecutiveSummary(intelligence, results, flows) {
    const failures = intelligence && intelligence.failures ? intelligence.failures : [];
    
    // Collect all failures with severity
    const allFailures = [...failures];
    
    // Count by severity
    const criticalCount = allFailures.filter(f => f.severity === 'CRITICAL').length;
    const warningCount = allFailures.filter(f => f.severity === 'WARNING').length;
    const infoCount = allFailures.filter(f => f.severity === 'INFO').length;
    
    // 1) Release Verdict
    let verdict = '🟢 SAFE TO RELEASE';
    let verdictClass = 'safe';
    
    if (criticalCount > 0) {
      verdict = '🔴 DO NOT RELEASE';
      verdictClass = 'danger';
    } else if (warningCount > 0) {
      verdict = '🟡 RELEASE WITH CAUTION';
      verdictClass = 'caution';
    }
    
    // 2) Risk Score (0-100)
    // Use severity weights: CRITICAL=40, WARNING=15, INFO=5
    const rawScore = (criticalCount * 40) + (warningCount * 15) + (infoCount * 5);
    const riskScore = Math.min(100, rawScore);
    
    // 3) Top Reason
    let topReason = 'No blocking risks detected';
    if (allFailures.length > 0) {
      // Sort by severity priority: CRITICAL > WARNING > INFO
      const sortedFailures = [...allFailures].sort((a, b) => {
        const severityOrder = { CRITICAL: 3, WARNING: 2, INFO: 1 };
        return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      });
      topReason = sortedFailures[0].name || sortedFailures[0].primaryHint || 'Failure detected';
    }
    
    // 4) Top 3 Risks
    const topRisks = allFailures
      .sort((a, b) => {
        const severityOrder = { CRITICAL: 3, WARNING: 2, INFO: 1 };
        return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      })
      .slice(0, 3)
      .map(f => ({
        title: f.name || f.primaryHint || 'Unknown issue',
        severity: f.severity || 'INFO',
        whyMatters: this._generateWhyMattersExplanation(f.breakType, f.domain)
      }));
    
    // 5) Recommended Next Action
    let nextAction = 'All systems nominal. Ready to deploy.';
    
    if (allFailures.length > 0) {
      const topFailure = allFailures.sort((a, b) => {
        const severityOrder = { CRITICAL: 3, WARNING: 2, INFO: 1 };
        return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      })[0];
      
      // Generate action based on break type and domain
      const breakType = topFailure.breakType || '';
      const domain = topFailure.domain || '';
      
      if (breakType === 'SUBMISSION' || domain === 'REVENUE') {
        nextAction = 'Fix checkout/submission flow before release — revenue impact detected.';
      } else if (breakType === 'VISUAL') {
        nextAction = 'Review visual regression and save a new baseline if changes are intentional.';
      } else if (breakType === 'NAVIGATION' || breakType === 'NETWORK') {
        nextAction = 'Verify deployment environment configuration and API availability.';
      } else if (breakType === 'TIMEOUT') {
        nextAction = 'Investigate performance issues and optimize slow endpoints.';
      } else if (domain === 'LEAD') {
        nextAction = 'Fix signup/contact form before release — lead generation impacted.';
      } else if (domain === 'TRUST') {
        nextAction = 'Fix authentication/login flow before release — user trust at risk.';
      } else {
        nextAction = `Address ${topFailure.severity || 'high-priority'} issue: ${topFailure.primaryHint || topFailure.name || 'detected failure'}.`;
      }
    }
    
    return {
      verdict,
      verdictClass,
      riskScore,
      topReason,
      topRisks,
      nextAction
    };
  }

  _buildSummary(results) {
    const successCount = results.filter(r => r.outcome === 'SUCCESS').length;
    const frictionCount = results.filter(r => r.outcome === 'FRICTION').length;
    const failureCount = results.filter(r => r.outcome === 'FAILURE').length;

    let overallVerdict = 'SUCCESS';
    if (failureCount > 0) {
      overallVerdict = 'FAILURE';
    } else if (frictionCount > 0) {
      overallVerdict = 'FRICTION';
    }

    return {
      successCount,
      frictionCount,
      failureCount,
      overallVerdict
    };
  }
}

module.exports = { MarketReporter };