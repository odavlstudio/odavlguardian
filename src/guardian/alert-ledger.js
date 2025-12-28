/**
 * Alert Ledger - Deduplication and Cooldown
 * Tracks emitted alerts to prevent spam
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Compute deterministic signature from drift reasons
 * @param {string[]} reasons - Array of drift reasons
 * @returns {string} - SHA256 hash (hex)
 */
function computeAlertSignature(reasons) {
  if (!Array.isArray(reasons) || reasons.length === 0) return null;
  
  // Normalize: sort and stringify
  const normalized = reasons.slice().sort();
  const str = JSON.stringify(normalized);
  return crypto.createHash('sha256').update(str).digest('hex');
}

function getLedgerPath(outDir) {
  const alertDir = path.join(outDir, 'alerts');
  if (!fs.existsSync(alertDir)) fs.mkdirSync(alertDir, { recursive: true });
  return path.join(alertDir, 'ledger.json');
}

function loadLedger(outDir) {
  const ledgerPath = getLedgerPath(outDir);
  if (!fs.existsSync(ledgerPath)) return { alerts: [] };
  try {
    return JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  } catch {
    return { alerts: [] };
  }
}

function saveLedger(outDir, ledger) {
  const ledgerPath = getLedgerPath(outDir);
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');
}

/**
 * Determine if alert should be emitted based on deduplication and cooldown
 * @param {string[]} reasons - Drift reasons
 * @param {string} severity - 'CRITICAL' or 'WARN'
 * @param {string} outDir - Artifacts directory
 * @param {number} cooldownMinutes - Cooldown period (default 60)
 * @returns {object} - {emit: boolean, reason: string, signature: string, severity: string}
 */
function shouldEmitAlert(reasons, severity, outDir, cooldownMinutes = 60) {
  const signature = computeAlertSignature(reasons);
  if (!signature) return { emit: false, reason: 'no drift reasons', signature: null, severity };

  const ledger = loadLedger(outDir);
  
  // First alert ever
  if (ledger.alerts.length === 0) {
    return { emit: true, reason: 'first alert (no ledger)', signature, severity };
  }

  // Find existing alert with same signature
  const existingAlert = ledger.alerts.find(a => a.signature === signature);
  
  if (!existingAlert) {
    // New drift pattern
    return { emit: true, reason: 'new drift pattern', signature, severity };
  }

  // Duplicate signature - check cooldown
  const lastTime = new Date(existingAlert.timestamp).getTime();
  const now = Date.now();
  const elapsedMinutes = (now - lastTime) / (60 * 1000);

  if (elapsedMinutes < cooldownMinutes) {
    // Check severity escalation
    if (existingAlert.severity === 'WARN' && severity === 'CRITICAL') {
      return { emit: true, reason: 'severity escalated from WARN to CRITICAL', signature, severity };
    }
    // Suppressed by cooldown
    return { emit: false, reason: `duplicate alert (cooldown active: ${Math.round(elapsedMinutes)}/${cooldownMinutes}min)`, signature, severity };
  }

  // Cooldown expired
  return { emit: true, reason: `cooldown expired (${Math.round(elapsedMinutes)}min)`, signature, severity };
}

/**
 * Record emitted alert to ledger
 * @param {string} signature - Alert signature
 * @param {string} severity - 'CRITICAL' or 'WARN'
 * @param {string} outDir - Artifacts directory
 */
function recordAlert(signature, severity, outDir) {
  const ledger = loadLedger(outDir);
  
  const alert = {
    signature,
    severity,
    timestamp: new Date().toISOString()
  };
  
  // Update or add alert
  const existingIndex = ledger.alerts.findIndex(a => a.signature === signature);
  if (existingIndex >= 0) {
    ledger.alerts[existingIndex] = alert;
  } else {
    ledger.alerts.push(alert);
  }
  
  saveLedger(outDir, ledger);
}

module.exports = {
  computeAlertSignature,
  shouldEmitAlert,
  recordAlert,
  loadLedger
};
