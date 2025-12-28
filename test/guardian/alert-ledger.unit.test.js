const { computeAlertSignature, shouldEmitAlert, recordAlert, loadLedger } = require('../../src/guardian/alert-ledger');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('alert-ledger', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), 'test-alert-ledger-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('computeAlertSignature produces consistent hash for same reasons', () => {
    const reasons1 = ['goal drift: true → false', 'decision drift: SAFE → RISK'];
    const reasons2 = ['decision drift: SAFE → RISK', 'goal drift: true → false'];
    
    const sig1 = computeAlertSignature(reasons1);
    const sig2 = computeAlertSignature(reasons2);
    
    expect(sig1).toBe(sig2); // Same content, different order → same signature
    expect(sig1).toMatch(/^[a-f0-9]{64}$/); // Valid SHA256 hex
  });

  test('computeAlertSignature produces different hash for different reasons', () => {
    const reasons1 = ['goal drift: true → false'];
    const reasons2 = ['decision drift: SAFE → RISK'];
    
    const sig1 = computeAlertSignature(reasons1);
    const sig2 = computeAlertSignature(reasons2);
    
    expect(sig1).not.toBe(sig2);
  });

  test('shouldEmitAlert allows new alert when no ledger exists', () => {
    const reasons = ['goal drift: true → false'];
    const severity = 'CRITICAL';
    
    const decision = shouldEmitAlert(reasons, severity, tmpDir);
    
    expect(decision.emit).toBe(true);
    expect(decision.reason).toContain('no ledger');
    expect(decision.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(decision.severity).toBe('CRITICAL');
  });

  test('shouldEmitAlert suppresses duplicate alert within cooldown', () => {
    const reasons = ['goal drift: true → false'];
    const severity = 'WARN';
    const cooldownMinutes = 60;
    
    // Record first alert
    const sig = computeAlertSignature(reasons);
    recordAlert(sig, severity, tmpDir);
    
    // Try same alert immediately
    const decision = shouldEmitAlert(reasons, severity, tmpDir, cooldownMinutes);
    
    expect(decision.emit).toBe(false);
    expect(decision.reason).toContain('duplicate');
    expect(decision.signature).toBe(sig);
  });

  test('shouldEmitAlert allows alert after cooldown expires', () => {
    const reasons = ['goal drift: true → false'];
    const severity = 'WARN';
    const cooldownMinutes = 0.001; // ~60ms
    
    // Record first alert
    const sig = computeAlertSignature(reasons);
    recordAlert(sig, severity, tmpDir);
    
    // Wait for cooldown to expire
    return new Promise(resolve => {
      setTimeout(() => {
        const decision = shouldEmitAlert(reasons, severity, tmpDir, cooldownMinutes);
        expect(decision.emit).toBe(true);
        expect(decision.reason).toContain('cooldown expired');
        resolve();
      }, 100);
    });
  });

  test('shouldEmitAlert escalates WARN→CRITICAL even within cooldown', () => {
    const reasons = ['goal drift: true → false'];
    
    // Record WARN alert
    const sig = computeAlertSignature(reasons);
    recordAlert(sig, 'WARN', tmpDir);
    
    // Try same alert with CRITICAL severity
    const decision = shouldEmitAlert(reasons, 'CRITICAL', tmpDir, 60);
    
    expect(decision.emit).toBe(true);
    expect(decision.reason).toContain('severity escalated');
    expect(decision.severity).toBe('CRITICAL');
  });

  test('shouldEmitAlert does not escalate CRITICAL→WARN', () => {
    const reasons = ['goal drift: true → false'];
    
    // Record CRITICAL alert
    const sig = computeAlertSignature(reasons);
    recordAlert(sig, 'CRITICAL', tmpDir);
    
    // Try same alert with WARN severity
    const decision = shouldEmitAlert(reasons, 'WARN', tmpDir, 60);
    
    expect(decision.emit).toBe(false);
    expect(decision.reason).toContain('duplicate');
  });

  test('recordAlert persists to ledger.json', () => {
    const reasons = ['goal drift: true → false'];
    const severity = 'CRITICAL';
    const sig = computeAlertSignature(reasons);
    
    recordAlert(sig, severity, tmpDir);
    
    const ledger = loadLedger(tmpDir);
    expect(ledger.alerts).toHaveLength(1);
    expect(ledger.alerts[0].signature).toBe(sig);
    expect(ledger.alerts[0].severity).toBe('CRITICAL');
    expect(ledger.alerts[0].timestamp).toBeDefined();
  });

  test('loadLedger returns empty structure when no file exists', () => {
    const ledger = loadLedger(tmpDir);
    
    expect(ledger).toEqual({ alerts: [] });
  });
});
