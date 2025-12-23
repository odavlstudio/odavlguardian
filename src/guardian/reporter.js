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
    
    // Calculate confidence
    let confidenceLevel = 'LOW';
    if (coverage >= 85) {
      confidenceLevel = 'HIGH';
    } else if (coverage >= 60) {
      confidenceLevel = 'MEDIUM';
    }
    
    // Calculate decision
    let decision = 'READY';
    if (coverage < 30) {
      decision = 'DO_NOT_LAUNCH';
    } else if (coverage < 60) {
      decision = 'INSUFFICIENT_CONFIDENCE';
    }
    
    // Check for critical errors (server errors only, not 404s)
    const failedPages = visited.filter(p => p.status && p.status >= 500);
    if (failedPages.length > 0) {
      decision = 'DO_NOT_LAUNCH';
    }
    
    const reasons = [];
    if (coverage < 30) reasons.push(`Low coverage (${coverage}%)`);
    if (failedPages.length > 0) reasons.push(`${failedPages.length} pages failed to load`);
    if (coverage >= 60) reasons.push(`Coverage is ${coverage}%`);
    if (failedPages.length === 0 && coverage >= 60) reasons.push('All visited pages loaded successfully');
    
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
        level: confidenceLevel,
        reasoning: `Coverage is ${coverage}% with ${failedPages.length} failed pages`
      },
      finalJudgment: {
        decision: decision,
        reasons: reasons.length > 0 ? reasons : ['All checks passed']
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
    
    // For flows: success = READY, failure = DO_NOT_LAUNCH
    const decision = success ? 'READY' : 'DO_NOT_LAUNCH';
    const confidenceLevel = success ? 'HIGH' : 'LOW';
    
    const reasons = [];
    if (success) {
      reasons.push(`Flow "${flowName}" completed successfully`);
      reasons.push(`All ${stepsTotal} steps executed`);
    } else {
      reasons.push(`Flow "${flowName}" failed at step ${failedStep}`);
      reasons.push(`Error: ${error}`);
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
          ? `Flow completed successfully (${stepsExecuted}/${stepsTotal} steps)` 
          : `Flow failed at step ${failedStep}: ${error}`
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
