const fs = require('fs');
const path = require('path');

class GuardianReporter {
  /**
   * Prepare artifacts directory for the current run
   * @param {string} artifactsDir - Base artifacts directory
   * @returns {object} { runDir, runId }
   */
  prepareArtifactsDir(artifactsDir) {
    const now = new Date();
    const dateStr = now.toISOString()
      .replace(/[:\-]/g, '')
      .substring(0, 15)
      .replace('T', '-');
    const runId = `run-${dateStr}`;
    
    const runDir = path.join(artifactsDir, runId);
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }
    
    return { runDir, runId };
  }

  createReport(crawlResult, baseUrl) {
    const { visited, totalDiscovered, totalVisited } = crawlResult;

    const coverage = totalDiscovered > 0
      ? parseFloat(((totalVisited / totalDiscovered) * 100).toFixed(2))
      : 0;

    const failedPages = visited.filter(p => p.status && p.status >= 500);
    const observedPages = visited.filter(p => p.status && p.status < 500);

    const reasons = [];
    reasons.push(`Observed page reachability only: visited ${totalVisited} page(s), discovered ${totalDiscovered}, coverage ${coverage}%.`);
    if (failedPages.length > 0) {
      reasons.push(`${failedPages.length} page(s) returned server errors or navigation failures.`);
    }
    if (observedPages.length > 0) {
      reasons.push(`HTTP responses observed for ${observedPages.length} page(s); no user flows or form submissions were executed.`);
    }
    reasons.push('No end-to-end user flows were validated; results are limited to link discovery and HTTP status observations.');

    const decision = 'INSUFFICIENT_DATA';

    return {
      version: 'mvp-0.1',
      timestamp: new Date().toISOString(),
      baseUrl: baseUrl,
      summary: {
        visitedPages: totalVisited,
        discoveredPages: totalDiscovered,
        coverage: coverage,
        failedPages: failedPages.length
      },
      confidence: {
        level: 'LOW',
        reasoning: 'Only page reachability was observed; no user flows were confirmed.'
      },
      finalJudgment: {
        decision: decision,
        reasons: reasons
      },
      pages: visited.map((p, i) => ({
        index: i + 1,
        url: p.url,
        status: p.status,
        links: p.linkCount,
        depth: p.depth,
        error: p.error || null
      }))
    };
  }

  /**
   * Create report from flow execution result
   * @param {object} flowResult - Flow execution result
   * @param {string} baseUrl - Base URL
   * @returns {object} Report object
   */
  createFlowReport(flowResult, baseUrl) {
    const { flowId, flowName, success, stepsExecuted, stepsTotal, failedStep, error } = flowResult;
    
    const coverage = stepsTotal > 0 
      ? parseFloat(((stepsExecuted / stepsTotal) * 100).toFixed(2))
      : 0;
    
    const decision = success ? 'OBSERVED' : 'PARTIAL';
    const confidenceLevel = success ? 'MEDIUM' : 'LOW';

    const reasons = [];
    if (success) {
      reasons.push(`Observed flow "${flowName}" end-to-end; ${stepsExecuted}/${stepsTotal} steps completed.`);
      reasons.push('No critical failures detected in this flow.');
    } else {
      reasons.push(`Flow "${flowName}" did not complete; stopped at step ${failedStep || 'unknown'} with error: ${error || 'unspecified failure'}.`);
      reasons.push('This run observed only the partial flow execution above; other flows were not validated.');
    }
    
    return {
      version: 'mvp-0.2',
      timestamp: new Date().toISOString(),
      baseUrl: baseUrl,
      mode: 'flow',
      flow: {
        id: flowId,
        name: flowName,
        stepsTotal: stepsTotal,
        stepsExecuted: stepsExecuted,
        failedStep: failedStep || null,
        error: error || null
      },
      summary: {
        visitedPages: stepsExecuted,
        discoveredPages: stepsTotal,
        coverage: coverage,
        failedPages: success ? 0 : 1
      },
      confidence: {
        level: confidenceLevel,
        reasoning: success 
          ? `Observed single flow execution; steps completed ${stepsExecuted}/${stepsTotal}.` 
          : `Flow incomplete; failed at step ${failedStep || 'unknown'} with error: ${error || 'unspecified failure'}.`
      },
      finalJudgment: {
        decision: decision,
        reasons: reasons
      },
      pages: flowResult.screenshots ? flowResult.screenshots.map((screenshot, i) => ({
        index: i + 1,
        url: `${baseUrl} (Flow step ${i + 1})`,
        status: 200,
        links: 0,
        screenshot: screenshot
      })) : []
    };
  }

  saveReport(report, artifactsDir) {
    // Create run directory
    const now = new Date();
    const dateStr = now.toISOString()
      .replace(/[:\-]/g, '')
      .substring(0, 15)
      .replace('T', '-');
    const runId = `run-${dateStr}`;
    
    const runDir = path.join(artifactsDir, runId);
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }
    
    // Save report.json
    const reportPath = path.join(runDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return {
      runId: runId,
      runDir: runDir,
      reportPath: reportPath
    };
  }
}

module.exports = { GuardianReporter };
