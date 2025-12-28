/**
 * JUnit XML Reporter
 * 
 * Generates JUnit-compatible XML for CI/CD integration.
 * - Compatible with Jenkins, GitLab CI, GitHub Actions, etc.
 * - Includes testcases for attempts and discovery results
 * - Captures failures and system output
 * 
 * NO AI. Deterministic XML generation.
 */

const fs = require('fs');
const path = require('path');
const { formatVerdictStatus, formatConfidence, formatVerdictWhy } = require('./text-formatters');

/**
 * Escape XML special characters
 */
function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build JUnit XML from snapshot
 */
function generateJunitXml(snapshot, baseUrl = '') {
  const runId = snapshot.meta?.runId || 'unknown';
  const createdAt = snapshot.meta?.createdAt || new Date().toISOString();
  const url = baseUrl || snapshot.meta?.url || 'unknown';

  let totalTests = 0;
  let totalFailures = 0;
  let totalSkipped = 0;
  const testCases = [];

  // ============================================================================
  // ATTEMPTS AS TESTCASES (Phase 1, 2)
  // ============================================================================

  if (snapshot.attempts && Array.isArray(snapshot.attempts)) {
    for (const attempt of snapshot.attempts) {
      const attemptId = attempt.attemptId || 'unknown';
      const attemptName = attempt.attemptName || attemptId;
      const outcome = attempt.outcome || 'UNKNOWN';
      const duration = (attempt.totalDurationMs || 0) / 1000; // Convert to seconds

      totalTests++;

      let testCase = `    <testcase name="${escapeXml(attemptName)}" classname="attempt.${escapeXml(attemptId)}" time="${duration}">\n`;

      if (outcome === 'FAILURE') {
        totalFailures++;
        const failMsg = `Attempt failed: ${attempt.goal}`;
        testCase += `      <failure message="${escapeXml(failMsg)}" type="AttemptFailure">\n`;
        if (attempt.error) {
          testCase += `${escapeXml(attempt.error)}\n`;
        }
        testCase += `      </failure>\n`;
      } else if (outcome === 'FRICTION') {
        const fricMsg = `Friction detected: ${attempt.friction?.summary || 'See logs'}`;
        testCase += `      <skipped message="${escapeXml(fricMsg)}" />\n`;
        totalSkipped++;
      }

      // Add soft failures as failure element
      if (attempt.softFailureCount && attempt.softFailureCount > 0) {
        totalFailures++;
        testCase += `      <failure message="Soft failures detected" type="SoftFailure">\n`;
        testCase += `${escapeXml(attempt.softFailureCount)} validator(s) failed\n`;

        if (attempt.validators && Array.isArray(attempt.validators)) {
          for (const validator of attempt.validators) {
            if (validator.status === 'FAIL' || validator.status === 'WARN') {
              testCase += `  - ${escapeXml(validator.id)}: ${escapeXml(validator.message)}\n`;
            }
          }
        }

        testCase += `      </failure>\n`;
      }

      testCase += `    </testcase>\n`;
      testCases.push(testCase);
    }
  }

  // ============================================================================
  // DISCOVERY RESULTS AS TESTCASES (Phase 4)
  // ============================================================================

  if (snapshot.discovery?.results && Array.isArray(snapshot.discovery.results)) {
    // Group results by outcome for cleaner reporting
    const discoveryResults = snapshot.discovery.results;

    // Summarize discovery: 1 testcase per outcome type
    const successCount = discoveryResults.filter(r => r.outcome === 'SUCCESS').length;
    const failureCount = discoveryResults.filter(r => r.outcome === 'FAILURE').length;
    const frictionCount = discoveryResults.filter(r => r.outcome === 'FRICTION').length;

    // Overall discovery testcase
    totalTests++;
    let discoveryTestCase = `    <testcase name="Discovery: Auto-Interaction Exploration" classname="discovery.autoexplore" time="0">\n`;

    if (failureCount > 0) {
      totalFailures++;
      discoveryTestCase += `      <failure message="Discovery failures detected" type="DiscoveryFailure">\n`;
      discoveryTestCase += `${failureCount} interaction(s) failed:\n`;

      discoveryResults
        .filter(r => r.outcome === 'FAILURE')
        .slice(0, 5) // Top 5 failures
        .forEach(r => {
          discoveryTestCase += `  - ${escapeXml(r.interactionId || 'unknown')}: ${escapeXml(r.errorMessage || 'Unknown error')}\n`;
        });

      if (failureCount > 5) {
        discoveryTestCase += `  ... and ${failureCount - 5} more\n`;
      }

      discoveryTestCase += `      </failure>\n`;
    }

    discoveryTestCase += `    </testcase>\n`;
    testCases.push(discoveryTestCase);
  }

  // ============================================================================
  // MARKET CRITICALITY AS TESTCASE (Phase 3)
  // ============================================================================

  const marketImpact = snapshot.marketImpactSummary || {};
  if (Object.keys(marketImpact).length > 0) {
    totalTests++;

    let marketTestCase = `    <testcase name="Market Criticality Assessment" classname="market.criticality" time="0">\n`;

    const criticalCount = marketImpact.countsBySeverity?.CRITICAL || 0;
    const warningCount = marketImpact.countsBySeverity?.WARNING || 0;

    if (criticalCount > 0) {
      totalFailures++;
      marketTestCase += `      <failure message="CRITICAL market risks detected" type="CriticalRisk">\n`;
      marketTestCase += `${criticalCount} CRITICAL risk(s) found\n`;

      if (marketImpact.topRisks && Array.isArray(marketImpact.topRisks)) {
        marketImpact.topRisks.slice(0, 3).forEach(risk => {
          marketTestCase += `  - ${escapeXml(risk.category || 'Unknown')}: ${escapeXml(risk.humanReadableReason || 'See logs')}\n`;
        });
      }

      marketTestCase += `      </failure>\n`;
    }

    marketTestCase += `    </testcase>\n`;
    testCases.push(marketTestCase);
  }

  // ============================================================================
  // BUILD XML
  // ============================================================================

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<testsuites>\n`;
  xml += `  <testsuite name="ODAVL Guardian" tests="${totalTests}" failures="${totalFailures}" skipped="${totalSkipped}" timestamp="${escapeXml(createdAt)}" time="0" hostname="guardian">\n`;

  // Properties
  xml += `    <properties>\n`;
  xml += `      <property name="runId" value="${escapeXml(runId)}" />\n`;
  xml += `      <property name="url" value="${escapeXml(url)}" />\n`;
  xml += `      <property name="createdAt" value="${escapeXml(createdAt)}" />\n`;
  // Verdict properties
  const v = snapshot.verdict || snapshot.meta?.verdict || null;
  if (v) {
    const cf = v.confidence || {};
    const whyShort = (v.why || '').slice(0, 200);
    xml += `      <property name="verdict" value="${escapeXml(v.verdict)}" />\n`;
    if (typeof cf.score === 'number') xml += `      <property name="confidenceScore" value="${escapeXml(String(cf.score))}" />\n`;
    if (cf.level) xml += `      <property name="confidenceLevel" value="${escapeXml(cf.level)}" />\n`;
    if (whyShort) xml += `      <property name="verdictWhy" value="${escapeXml(whyShort)}" />\n`;
  }
  xml += `    </properties>\n`;

  // Testcases
  xml += testCases.join('');

  // System output
  xml += `    <system-out>\n`;
  xml += `ODAVL Guardian Test Run\n`;
  xml += `URL: ${escapeXml(url)}\n`;
  xml += `Run ID: ${escapeXml(runId)}\n`;
  xml += `Created: ${escapeXml(createdAt)}\n\n`;
  if (v) {
    xml += `Verdict: ${escapeXml(formatVerdictStatus(v))}\n`;
    xml += `Confidence: ${escapeXml(formatConfidence(v))}\n`;
    const why = formatVerdictWhy(v);
    if (why) xml += `Why: ${escapeXml(why)}\n\n`;
  }

  xml += `Summary:\n`;
  xml += `  Total Tests: ${totalTests}\n`;
  xml += `  Failures: ${totalFailures}\n`;
  xml += `  Not Executed (JUnit skipped): ${totalSkipped}\n`;

  if (marketImpact.countsBySeverity) {
    xml += `\nMarket Impact:\n`;
    xml += `  CRITICAL: ${marketImpact.countsBySeverity.CRITICAL || 0}\n`;
    xml += `  WARNING: ${marketImpact.countsBySeverity.WARNING || 0}\n`;
    xml += `  INFO: ${marketImpact.countsBySeverity.INFO || 0}\n`;
  }

  if (snapshot.discovery) {
    xml += `\nDiscovery Results:\n`;
    xml += `  Pages Visited: ${snapshot.discovery.pagesVisitedCount || 0}\n`;
    xml += `  Interactions Discovered: ${snapshot.discovery.interactionsDiscovered || 0}\n`;
    xml += `  Interactions Executed: ${snapshot.discovery.interactionsExecuted || 0}\n`;
  }

  xml += `    </system-out>\n`;

  xml += `  </testsuite>\n`;
  xml += `</testsuites>\n`;

  return xml;
}

/**
 * Write JUnit XML to file
 */
function writeJunitFile(snapshot, outputPath, baseUrl = '') {
  const xml = generateJunitXml(snapshot, baseUrl);

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, xml, 'utf8');
  return outputPath;
}

/**
 * Validate XML is well-formed (basic check)
 */
function validateJunitXml(xmlContent) {
  try {
    // Basic XML validation: check opening and closing tags
    if (!xmlContent.includes('<?xml')) {
      return { valid: false, errors: ['Missing XML declaration'] };
    }

    if (!xmlContent.includes('<testsuites>') || !xmlContent.includes('</testsuites>')) {
      return { valid: false, errors: ['Missing testsuites root element'] };
    }

    if (!xmlContent.includes('<testsuite') || !xmlContent.includes('</testsuite>')) {
      return { valid: false, errors: ['Missing testsuite element'] };
    }

    // Check for unescaped characters
    if (xmlContent.includes('&') && !xmlContent.includes('&amp;')) {
      return { valid: false, errors: ['Unescaped & character found'] };
    }

    return { valid: true, errors: [] };
  } catch (e) {
    return { valid: false, errors: [e.message] };
  }
}

module.exports = {
  generateJunitXml,
  writeJunitFile,
  validateJunitXml,
  escapeXml
};
