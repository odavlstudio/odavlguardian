const { classifySeverity } = require('../../src/guardian/drift-detector');

describe('drift-detector severity classification', () => {
  test('classifySeverity returns CRITICAL when decision drifts to DO_NOT_LAUNCH', () => {
    const driftInfo = {
      hasDrift: true,
      reasons: ['decision drift: SAFE → DO_NOT_LAUNCH']
    };
    const result = { decision: 'DO_NOT_LAUNCH' };
    
    const severity = classifySeverity(driftInfo, result);
    
    expect(severity).toBe('CRITICAL');
  });

  test('classifySeverity returns CRITICAL when site becomes unreachable', () => {
    const driftInfo = {
      hasDrift: true,
      reasons: ['critical step failed: navigate to homepage']
    };
    const result = { decision: 'DO_NOT_LAUNCH' };
    
    const severity = classifySeverity(driftInfo, result);
    
    expect(severity).toBe('CRITICAL');
  });

  test('classifySeverity returns CRITICAL when goal drifts from reached to unreached', () => {
    const driftInfo = {
      hasDrift: true,
      reasons: ['goal drift: true → false']
    };
    const result = { decision: 'RISK', goalReached: false };
    
    const severity = classifySeverity(driftInfo, result);
    
    expect(severity).toBe('CRITICAL');
  });

  test('classifySeverity returns WARN when decision drifts to RISK', () => {
    const driftInfo = {
      hasDrift: true,
      reasons: ['decision drift: SAFE → RISK']
    };
    const result = { decision: 'RISK', goalReached: true };
    
    const severity = classifySeverity(driftInfo, result);
    
    expect(severity).toBe('WARN');
  });

  test('classifySeverity returns WARN when intent changes', () => {
    const driftInfo = {
      hasDrift: true,
      reasons: ['intent drift: saas → shop']
    };
    const result = { decision: 'SAFE', goalReached: true };
    
    const severity = classifySeverity(driftInfo, result);
    
    expect(severity).toBe('WARN');
  });

  test('classifySeverity returns WARN for non-critical step failures', () => {
    const driftInfo = {
      hasDrift: true,
      reasons: ['step changed: login link not found']
    };
    const result = { decision: 'RISK', goalReached: true };
    
    const severity = classifySeverity(driftInfo, result);
    
    expect(severity).toBe('WARN');
  });

  test('classifySeverity returns CRITICAL when reason contains "SITE_UNREACHABLE"', () => {
    const driftInfo = {
      hasDrift: true,
      reasons: ['SITE_UNREACHABLE']
    };
    const result = { decision: 'DO_NOT_LAUNCH' };
    
    const severity = classifySeverity(driftInfo, result);
    
    expect(severity).toBe('CRITICAL');
  });
});
