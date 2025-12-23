/**
 * Guardian HTML Report Generator
 * Creates beautiful, self-contained HTML reports
 */

const fs = require('fs');
const path = require('path');

class GuardianHTMLReporter {
  /**
   * Generate HTML report from JSON report
   * @param {object} jsonReport - JSON report object
   * @param {string} artifactsDir - Directory containing artifacts
   * @returns {string} HTML content
   */
  generate(jsonReport, artifactsDir) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Guardian Report - ${jsonReport.baseUrl}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .header .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
        }
        .verdict {
            background: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .verdict.ready {
            border-left: 5px solid #10b981;
        }
        .verdict.do-not-launch {
            border-left: 5px solid #ef4444;
        }
        .verdict.insufficient {
            border-left: 5px solid #f59e0b;
        }
        .verdict-badge {
            display: inline-block;
            padding: 10px 20px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 1.2em;
            margin-bottom: 15px;
        }
        .verdict-badge.ready {
            background: #d1fae5;
            color: #065f46;
        }
        .verdict-badge.do-not-launch {
            background: #fee2e2;
            color: #991b1b;
        }
        .verdict-badge.insufficient {
            background: #fef3c7;
            color: #92400e;
        }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .metric-card .label {
            font-size: 0.9em;
            color: #666;
            margin-bottom: 5px;
        }
        .metric-card .value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        .section {
            background: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .section h2 {
            margin-bottom: 20px;
            color: #667eea;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 10px;
        }
        .reason-list {
            list-style: none;
        }
        .reason-list li {
            padding: 10px;
            margin-bottom: 10px;
            background: #f9fafb;
            border-left: 3px solid #667eea;
            border-radius: 5px;
        }
        .screenshots {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
        }
        .screenshot-card {
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            overflow: hidden;
            transition: transform 0.2s;
        }
        .screenshot-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        .screenshot-card img {
            width: 100%;
            height: 200px;
            object-fit: cover;
        }
        .screenshot-card .caption {
            padding: 10px;
            background: #f9fafb;
            font-size: 0.9em;
            color: #666;
        }
        .page-table {
            width: 100%;
            border-collapse: collapse;
        }
        .page-table th {
            background: #f9fafb;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #e5e7eb;
        }
        .page-table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
        }
        .page-table tr:hover {
            background: #f9fafb;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 600;
        }
        .status-success {
            background: #d1fae5;
            color: #065f46;
        }
        .status-error {
            background: #fee2e2;
            color: #991b1b;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 0.9em;
        }
        .confidence-high { color: #10b981; font-weight: bold; }
        .confidence-medium { color: #f59e0b; font-weight: bold; }
        .confidence-low { color: #ef4444; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ ODAVL Guardian</h1>
            <div class="subtitle">Market Reality Testing Report</div>
        </div>

        ${this.generateVerdictSection(jsonReport)}
        ${this.generateMetricsSection(jsonReport)}
        ${this.generateReasonsSection(jsonReport)}
        ${this.generatePagesSection(jsonReport)}
        ${this.generateScreenshotsSection(jsonReport, artifactsDir)}
        
        <div class="footer">
            Generated by ODAVL Guardian • ${new Date(jsonReport.timestamp).toLocaleString()}
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Generate verdict section
   */
  generateVerdictSection(report) {
    const decision = report.finalJudgment.decision;
    const decisionClass = decision.toLowerCase().replace(/_/g, '-');
    const decisionIcon = decision === 'READY' ? '🟢' : decision === 'DO_NOT_LAUNCH' ? '🔴' : '🟡';
    const decisionText = decision === 'READY' ? 'Safe to Launch' : decision === 'DO_NOT_LAUNCH' ? 'DO NOT LAUNCH' : 'Insufficient Confidence';

    return `
        <div class="verdict ${decisionClass}">
            <div class="verdict-badge ${decisionClass}">
                ${decisionIcon} ${decisionText}
            </div>
            <p style="margin-top: 15px; font-size: 1.1em;">
                <strong>Target:</strong> ${report.baseUrl}
            </p>
            <p style="margin-top: 10px;">
                <strong>Confidence:</strong> 
                <span class="confidence-${report.confidence.level.toLowerCase()}">${report.confidence.level}</span>
            </p>
            <p style="margin-top: 5px; color: #666;">
                ${report.confidence.reasoning}
            </p>
        </div>
    `;
  }

  /**
   * Generate metrics section
   */
  generateMetricsSection(report) {
    return `
        <div class="metrics">
            <div class="metric-card">
                <div class="label">Coverage</div>
                <div class="value">${report.summary.coverage}%</div>
            </div>
            <div class="metric-card">
                <div class="label">Pages Visited</div>
                <div class="value">${report.summary.visitedPages}</div>
            </div>
            <div class="metric-card">
                <div class="label">Pages Discovered</div>
                <div class="value">${report.summary.discoveredPages}</div>
            </div>
            <div class="metric-card">
                <div class="label">Failed Pages</div>
                <div class="value" style="color: ${report.summary.failedPages > 0 ? '#ef4444' : '#10b981'}">
                    ${report.summary.failedPages}
                </div>
            </div>
        </div>
    `;
  }

  /**
   * Generate reasons section
   */
  generateReasonsSection(report) {
    const reasons = report.finalJudgment.reasons || [];
    if (reasons.length === 0) return '';

    const reasonItems = reasons.map(r => `<li>${r}</li>`).join('');

    return `
        <div class="section">
            <h2>📋 Decision Reasons</h2>
            <ul class="reason-list">
                ${reasonItems}
            </ul>
        </div>
    `;
  }

  /**
   * Generate pages section
   */
  generatePagesSection(report) {
    const pages = report.pages || [];
    if (pages.length === 0) return '';

    const rows = pages.map(page => {
      const statusClass = page.status >= 200 && page.status < 400 ? 'status-success' : 'status-error';
      const statusText = page.status || 'N/A';
      
      return `
        <tr>
            <td>${page.index}</td>
            <td style="word-break: break-all;">${page.url}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${page.links || 0}</td>
        </tr>
      `;
    }).join('');

    return `
        <div class="section">
            <h2>📄 Pages Visited</h2>
            <table class="page-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>URL</th>
                        <th>Status</th>
                        <th>Links</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
  }

  /**
   * Generate screenshots section
   */
  generateScreenshotsSection(report, artifactsDir) {
    const pagesDir = path.join(artifactsDir, 'pages');
    
    // Check if pages directory exists
    if (!fs.existsSync(pagesDir)) {
      return '';
    }

    // Get all screenshot files
    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png'));
    
    if (files.length === 0) {
      return '';
    }

    const cards = files.map(file => {
      const relativePath = `pages/${file}`;
      return `
        <div class="screenshot-card">
            <img src="${relativePath}" alt="${file}" loading="lazy">
            <div class="caption">${file}</div>
        </div>
      `;
    }).join('');

    return `
        <div class="section">
            <h2>📸 Screenshots</h2>
            <div class="screenshots">
                ${cards}
            </div>
        </div>
    `;
  }

  /**
   * Save HTML report to file
   * @param {string} html - HTML content
   * @param {string} outputPath - Where to save the HTML file
   * @returns {boolean} Success status
   */
  save(html, outputPath) {
    try {
      fs.writeFileSync(outputPath, html, 'utf8');
      return true;
    } catch (error) {
      console.error(`❌ Failed to save HTML report: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate and save HTML report
   * @param {object} jsonReport - JSON report object
   * @param {string} artifactsDir - Directory containing artifacts
   * @returns {boolean} Success status
   */
  generateAndSave(jsonReport, artifactsDir) {
    try {
      const html = this.generate(jsonReport, artifactsDir);
      const outputPath = path.join(artifactsDir, 'report.html');
      return this.save(html, outputPath);
    } catch (error) {
      console.error(`❌ Failed to generate HTML report: ${error.message}`);
      return false;
    }
  }
}

module.exports = GuardianHTMLReporter;
