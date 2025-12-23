/**
 * Phase 6 Productization Tests
 * - Scan presets mapping
 * - CLI summary top 3 issues
 * - Backward compatibility (existing commands still present)
 */

const assert = require('assert');
const { resolveScanPreset } = require('../src/guardian/scan-presets');
const { generateCliSummary } = require('../src/guardian/cli-summary');

console.log('\n🧪 Phase 6 Productization Tests');

// Preset behavior selection
{
  const landing = resolveScanPreset('landing');
  assert(Array.isArray(landing.attempts) && landing.attempts.includes('contact_form'), 'landing attempts include contact_form');
  assert(landing.flows.length === 0, 'landing has no flows');
  assert(landing.policy.visualGates.maxDiffPercent === 25, 'landing visual gate 25%');
  console.log('✅ Landing preset mapping');
}

{
  const saas = resolveScanPreset('saas');
  assert(saas.flows.includes('signup_flow') && saas.flows.includes('login_flow'), 'saas flows include signup/login');
  assert(saas.policy.maxWarnings === 1, 'saas warnings ≤ 1');
  assert(saas.policy.visualGates.maxDiffPercent === 20, 'saas visual gate 20%');
  console.log('✅ SaaS preset mapping');
}

{
  const shop = resolveScanPreset('shop');
  assert(shop.flows.includes('checkout_flow'), 'shop includes checkout flow');
  assert(shop.policy.maxWarnings === 0, 'shop warnings 0');
  assert(shop.policy.visualGates.maxDiffPercent === 15, 'shop visual gate 15%');
  console.log('✅ Shop preset mapping');
}

// CLI summary formatting — top 3 issues
{
  const snapshot = {
    meta: { url: 'https://example.com', runId: 'market-run-test' },
    marketImpactSummary: {
      countsBySeverity: { CRITICAL: 1, WARNING: 2, INFO: 0 },
      topRisks: [
        { humanReadableReason: 'Checkout total incorrect', category: 'REVENUE', severity: 'CRITICAL', impactScore: 95 },
        { humanReadableReason: 'Contact form friction', category: 'LEAD', severity: 'WARNING', impactScore: 60 },
        { humanReadableReason: 'Language switch delayed', category: 'TRUST', severity: 'WARNING', impactScore: 40 },
      ]
    },
    attempts: []
  };
  const summary = generateCliSummary(snapshot, null);
  assert(summary.includes('Top Issues'), 'Summary shows Top Issues');
  assert(summary.includes('1. Checkout total incorrect'), 'Shows issue 1');
  assert(summary.includes('2. Contact form friction'), 'Shows issue 2');
  assert(summary.includes('3. Language switch delayed'), 'Shows issue 3');
  assert(summary.includes('Full report: artifacts/market-run-test/'), 'Shows report path');
  console.log('✅ CLI summary shows top 3 issues');
}

// Backward compatibility: commands still routed
{
  const cli = require('../bin/guardian.js');
  // We cannot execute here, but ensure module loads without throwing
  console.log('✅ CLI module loaded');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Phase 6 Productization tests PASSED');
