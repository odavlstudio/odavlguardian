const fs = require('fs');
const path = require('path');

class BaselineCheckReporter {
  saveJsonReport(report, artifactsDir) {
    const p = path.join(artifactsDir, 'baseline-check-report.json');
    fs.writeFileSync(p, JSON.stringify(report, null, 2));
    return p;
  }

  generateHtmlReport(report) {
    const verdict = report.overallRegressionVerdict;
    const color = verdict === 'NO_REGRESSION' ? '#10b981' : verdict === 'REGRESSION_FRICTION' ? '#f59e0b' : '#ef4444';
    const emoji = verdict === 'NO_REGRESSION' ? '🟢' : verdict === 'REGRESSION_FRICTION' ? '🟡' : '🔴';

    const rows = report.comparisons.map((c, i) => {
      const badgeColor = c.regressionType === 'NO_REGRESSION' ? '#10b981' : (c.regressionType.startsWith('REGRESSION_FRICTION') ? '#f59e0b' : '#ef4444');
      const badgeText = c.regressionType.replace(/_/g, ' ');
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${c.attemptId}</td>
          <td>${c.baselineOutcome}</td>
          <td>${c.currentOutcome}</td>
          <td><span class="badge" style="background:${badgeColor}">${badgeText}</span></td>
          <td>${(c.keyMetricsDelta.durationPct ?? 0).toFixed(2)}%</td>
          <td>${c.keyMetricsDelta.retriesDelta ?? 0}</td>
          <td>
            ${c.links.reportHtml ? `<a href="${path.basename(c.links.reportHtml)}" target="_blank">Attempt HTML</a>` : ''}
            ${c.links.reportJson ? ` | <a href="${path.basename(c.links.reportJson)}" target="_blank">Attempt JSON</a>` : ''}
          </td>
        </tr>
        <tr class="details">
          <td colspan="8">
            <details>
              <summary>Details</summary>
              <div class="detail-content">
                <p><strong>Regression Reasons:</strong> ${c.regressionReasons.length ? c.regressionReasons.join('; ') : 'None'}</p>
                <p><strong>Improvements:</strong> ${c.improvements.length ? c.improvements.join('; ') : 'None'}</p>
                <p><strong>Friction Delta:</strong> added=[${(c.frictionDelta.added||[]).join(', ')}], removed=[${(c.frictionDelta.removed||[]).join(', ')}], changed=[${(c.frictionDelta.changed||[]).map(x=>x.id).join(', ')}]</p>
              </div>
            </details>
          </td>
        </tr>
      `;
    }).join('');

    const flowRows = (report.flowComparisons || []).map((c, i) => {
      const badgeColor = c.regressionType === 'NO_REGRESSION' ? '#10b981' : '#ef4444';
      const badgeText = c.regressionType.replace(/_/g, ' ');
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${c.flowId}</td>
          <td>${c.baselineOutcome}</td>
          <td>${c.currentOutcome}</td>
          <td><span class="badge" style="background:${badgeColor}">${badgeText}</span></td>
          <td colspan="3">${c.regressionReasons.slice(0,2).join('; ') || '—'}</td>
        </tr>
      `;
    }).join('');

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Baseline Check Report</title>
  <style>
    body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial; background:#f6f7fb; color:#1f2937; padding:20px; }
    .container { max-width: 1100px; margin: 0 auto; }
    .header { background: #111827; color:#fff; padding:20px; border-radius:12px; }
    .badge { color:#fff; padding:6px 10px; border-radius:999px; font-size:0.85em; }
    .verdict { display:inline-flex; align-items:center; gap:8px; background:${color}; color:#fff; padding:10px 14px; border-radius:999px; font-weight:bold; }
    table { width:100%; border-collapse:collapse; background:#fff; border-radius:10px; overflow:hidden; margin-top:16px; }
    th, td { padding:10px 12px; border-bottom:1px solid #e5e7eb; text-align:left; }
    th { background:#f3f4f6; }
    tr.details td { background:#fafafa; }
    details { margin: 6px 0; }
    .meta { display:flex; gap:16px; color:#e5e7eb; margin-top:8px; font-size:0.95em; }
  </style>
  </head>
<body>
  <div class="container">
    <div class="header">
      <h1>Baseline Check</h1>
      <div class="verdict">${emoji} ${verdict}</div>
      <div class="meta">
        <div><strong>Baseline:</strong> ${report.meta.baselineName}</div>
        <div><strong>URL:</strong> ${report.meta.baseUrl}</div>
        <div><strong>Run ID:</strong> ${report.meta.runId}</div>
        <div><strong>Time:</strong> ${report.meta.timestamp}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Attempt</th>
          <th>Baseline</th>
          <th>Current</th>
          <th>Regression</th>
          <th>Δ Duration %</th>
          <th>Δ Retries</th>
          <th>Links</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    ${flowRows ? `
    <h3 style="margin-top:20px;">Intent Flows</h3>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Flow</th>
          <th>Baseline</th>
          <th>Current</th>
          <th>Regression</th>
          <th colspan="3">Notes</th>
        </tr>
      </thead>
      <tbody>
        ${flowRows}
      </tbody>
    </table>` : ''}
  </div>
  </body>
</html>`;
  }

  saveHtmlReport(html, artifactsDir) {
    const p = path.join(artifactsDir, 'baseline-check-report.html');
    fs.writeFileSync(p, html, 'utf8');
    return p;
  }
}

module.exports = { BaselineCheckReporter };
