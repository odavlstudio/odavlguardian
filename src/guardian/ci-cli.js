const path = require('path');
const fs = require('fs');
const { scanJourney } = require('./journey-scanner');
const { detectSiteIntent, selectJourneyByIntent } = require('./intent-detector');
const { buildBaselineFromJourneyResult, compareAgainstBaseline, classifySeverity } = require('./drift-detector');
const { shouldEmitAlert } = require('./alert-ledger');

/**
 * Run CI gate scan:
 * - Single journey run
 * - Compare against baseline if exists
 * - Apply alert dedup + cooldown
 * - Generate ci-result.json
 * - Exit with stable codes
 */
async function runCIGate(config) {
  const { baseUrl, artifactsDir, headless, timeout, preset, presetProvided } = config;
  
  const outDir = path.resolve(artifactsDir, 'ci');
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`[CI] Scanning ${baseUrl}...`);

  let selectedPreset = preset;
  let siteIntent = null;

  // Auto-detect intent if no preset provided
  if (!presetProvided) {
    console.log('[CI] Auto-detecting site intent...');
    try {
      siteIntent = await detectSiteIntent(baseUrl, { headless, timeout });
      selectedPreset = selectJourneyByIntent(siteIntent);
      console.log(`[CI] Detected intent: ${siteIntent.type}, selected preset: ${selectedPreset}`);
    } catch (err) {
      console.error('[CI] Intent detection failed:', err.message);
      selectedPreset = 'saas';
    }
  }

  // Run journey
  let result;
  try {
    result = await scanJourney({ baseUrl, preset: selectedPreset, headless, timeout });
  } catch (err) {
    console.error('[CI] Journey scan failed:', err.message);
    const ciResult = {
      decision: 'DO_NOT_LAUNCH',
      severity: 'CRITICAL',
      driftDetected: false,
      goalReached: false,
      intent: siteIntent ? siteIntent.type : 'unknown',
      reasons: ['Journey scan failed: ' + err.message],
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(path.join(outDir, 'ci-result.json'), JSON.stringify(ciResult, null, 2));
    return 2;
  }

  // Check for baseline
  const baselinePath = path.resolve(artifactsDir, 'baseline.json');
  let driftInfo = null;
  let severity = 'WARN';

  if (fs.existsSync(baselinePath)) {
    console.log('[CI] Comparing against baseline...');
    const baselineData = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
    driftInfo = compareAgainstBaseline(result, baselineData);
    
    if (driftInfo.hasDrift) {
      severity = classifySeverity(driftInfo, result);
      console.log(`[CI] Drift detected (${severity}): ${driftInfo.reasons.join(', ')}`);
      
      // Check alert dedup and cooldown
      const alertDecision = shouldEmitAlert(driftInfo.reasons, severity, artifactsDir);
      if (!alertDecision.emit) {
        console.log(`[CI] Alert suppressed: ${alertDecision.reason}`);
        // Generate CI result showing suppression
        const ciResult = {
          decision: result.decision,
          severity,
          driftDetected: true,
          goalReached: result.goalReached || false,
          intent: result.intent || 'unknown',
          reasons: driftInfo.reasons,
          alertSuppressed: true,
          suppressionReason: alertDecision.reason,
          timestamp: new Date().toISOString()
        };
        fs.writeFileSync(path.join(outDir, 'ci-result.json'), JSON.stringify(ciResult, null, 2));
        return severity === 'CRITICAL' ? 4 : 0;
      }
    } else {
      console.log('[CI] No drift detected');
    }
  } else {
    console.log('[CI] No baseline found, capturing new baseline...');
    const baseline = buildBaselineFromJourneyResult(result);
    fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
  }

  // Generate ci-result.json
  const ciResult = {
    decision: result.decision,
    severity: driftInfo ? severity : (result.decision === 'DO_NOT_LAUNCH' ? 'CRITICAL' : 'WARN'),
    driftDetected: driftInfo ? driftInfo.hasDrift : false,
    goalReached: result.goalReached || false,
    intent: result.intent || 'unknown',
    reasons: driftInfo ? driftInfo.reasons : [],
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(path.join(outDir, 'ci-result.json'), JSON.stringify(ciResult, null, 2));
  console.log(`[CI] Result: ${ciResult.decision} (${ciResult.severity})`);

  // Exit code based on decision and severity
  if (ciResult.decision === 'DO_NOT_LAUNCH') return 2;
  if (ciResult.decision === 'RISK' || ciResult.severity === 'WARN') return 1;
  return 0;
}

module.exports = { runCIGate };
