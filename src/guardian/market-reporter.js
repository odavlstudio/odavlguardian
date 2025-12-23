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
    const verdictColor = summary.overallVerdict === 'SUCCESS' ? '#10b981'
      : summary.overallVerdict === 'FRICTION' ? '#f59e0b'
      : '#ef4444';
    const verdictEmoji = summary.overallVerdict === 'SUCCESS' ? '🟢' : summary.overallVerdict === 'FRICTION' ? '🟡' : '🔴';

    const attemptsRows = results.map((result, idx) => {
      const color = result.outcome === 'SUCCESS' ? '#10b981' : result.outcome === 'FRICTION' ? '#f59e0b' : '#ef4444';
      const badge = result.outcome === 'SUCCESS' ? '✅ SUCCESS' : result.outcome === 'FRICTION' ? '⚠️ FRICTION' : '❌ FAILURE';
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
      const color = flow.outcome === 'SUCCESS' ? '#10b981' : '#ef4444';
      const badge = flow.outcome === 'SUCCESS' ? '✅ SUCCESS' : '❌ FAILURE';
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${flow.flowId}</td>
          <td>${flow.flowName || ''}</td>
          <td><span class="badge" style="background:${color}">${badge}</span></td>
          <td>${flow.stepsExecuted || 0}/${flow.stepsTotal || 0}</td>
          <td>${flow.error || ''}</td>
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
    .signal-card.severity-low { background: #f0f9ff; border-color: #7dd3fc; border-left-color: #0ea5e9; }
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
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Market Reality Report</h1>
      <div class="verdict">${verdictEmoji} ${summary.overallVerdict}</div>
      <div class="meta">
        <div><strong>Run ID:</strong> ${runId}</div>
        <div><strong>Base URL:</strong> ${baseUrl}</div>
        <div><strong>Attempts:</strong> ${attemptsRun.join(', ')}</div>
        <div><strong>Manual:</strong> ${manualResults.length} | <strong>Auto:</strong> ${autoResults.length} 🤖</div>
        <div><strong>Flows:</strong> ${flowSummary.total} (✅ ${flowSummary.success} / ❌ ${flowSummary.failure})</div>
        <div><strong>Timestamp:</strong> ${timestamp}</div>
      </div>
    </div>

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

    ${flows.length ? `
    <h3 style="margin-top:24px;">Intent Flows</h3>
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
    ` : ''}

    ${intelligence && intelligence.totalFailures > 0 ? `
    <h3 style="margin-top:24px;">🔍 Breakage Intelligence</h3>
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