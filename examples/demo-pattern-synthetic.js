/**
 * Synthetic Pattern Generation for Demo
 * Creates test runs with realistic patterns for Stage V demonstration
 */

const fs = require('fs');
const path = require('path');
const { analyzePatterns } = require('./src/guardian/pattern-analyzer');

// Create synthetic run data demonstrating all 4 pattern types
function createSyntheticRuns() {
  const testDir = './test-artifacts/pattern-demo';
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // Clear any existing test runs
  const entries = fs.readdirSync(testDir);
  for (const entry of entries) {
    const fullPath = path.join(testDir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      fs.rmSync(fullPath, { recursive: true });
    }
  }

  console.log('\n🔧 Creating synthetic runs with realistic patterns...\n');

  // Pattern 1: Repeated skipped attempts (payment review always skipped)
  // Pattern 2: Recurring friction on checkout (3 of 4 runs show friction)
  // Pattern 3: Confidence declining (0.95 → 0.75)
  // Pattern 4: Single point of failure (login-mfa fails 3 of 4)

  const runDates = [
    '2025-12-27_08-00-00',
    '2025-12-27_09-15-00',
    '2025-12-27_10-30-00',
    '2025-12-27_11-45-00'
  ];

  for (let i = 0; i < 4; i++) {
    const runDir = path.join(testDir, `${runDates[i]}_demo-site_default_WARN`);
    fs.mkdirSync(runDir, { recursive: true });

    const isLastRun = i === 3;
    const hasCheckoutFriction = i < 3; // Friction in first 3 runs, fixed in last
    const hasMfaFailure = i !== 1; // Fails except in 2nd run

    // Compute confidence score (declining trend)
    const confidenceScores = [0.95, 0.85, 0.80, 0.75];

    const meta = {
      version: 1,
      timestamp: new Date(new Date('2025-12-27').getTime() + i * 3600000 * 1.25).toISOString(),
      url: 'https://demo-site.example.com',
      siteSlug: 'demo-site',
      policy: 'default',
      result: hasCheckoutFriction ? 'WARN' : 'PASSED',
      durationMs: 45000 + i * 1000,
      attempts: {
        total: 6,
        successful: 5 - (hasMfaFailure ? 1 : 0) - (hasCheckoutFriction ? 1 : 0),
        failed: (hasMfaFailure ? 1 : 0),
        skipped: 1
      }
    };

    const snapshot = {
      schemaVersion: 'v1',
      meta,
      verdict: {
        verdict: hasCheckoutFriction ? 'FRICTION' : 'READY',
        confidence: {
          level: confidenceScores[i] > 0.8 ? 'high' : 'medium',
          score: confidenceScores[i]
        },
        why: `${5 - (hasMfaFailure ? 1 : 0) - (hasCheckoutFriction ? 1 : 0)} of 5 attempts completed successfully`,
        keyFindings: [
          `${5 - (hasMfaFailure ? 1 : 0) - (hasCheckoutFriction ? 1 : 0)} of 5 executed attempts completed`,
          hasCheckoutFriction ? '1 attempt showed friction' : 'No friction observed',
          '1 attempt was not executed (review payment)'
        ]
      },
      attempts: [
        {
          attemptId: 'homepage',
          attemptName: 'Load Homepage',
          outcome: 'SUCCESS',
          totalDurationMs: 800
        },
        {
          attemptId: 'login',
          attemptName: 'User Login',
          outcome: 'SUCCESS',
          totalDurationMs: 1200
        },
        {
          attemptId: 'login-mfa',
          attemptName: 'MFA Verification',
          outcome: hasMfaFailure ? 'FAILURE' : 'SUCCESS',
          totalDurationMs: hasMfaFailure ? 5000 : 2500,
          friction: { isFriction: false }
        },
        {
          attemptId: 'browse-products',
          attemptName: 'Browse Products',
          outcome: 'SUCCESS',
          totalDurationMs: 3200
        },
        {
          attemptId: 'checkout',
          attemptName: 'Checkout Flow',
          outcome: hasCheckoutFriction ? 'FRICTION' : 'SUCCESS',
          totalDurationMs: hasCheckoutFriction ? 6500 : 2800,
          friction: { isFriction: hasCheckoutFriction }
        },
        {
          attemptId: 'review-payment',
          attemptName: 'Review Payment Details',
          outcome: 'SKIPPED',
          totalDurationMs: 0
        }
      ]
    };

    // Write META.json
    fs.writeFileSync(
      path.join(runDir, 'META.json'),
      JSON.stringify(meta, null, 2),
      'utf8'
    );

    // Write snapshot.json
    fs.writeFileSync(
      path.join(runDir, 'snapshot.json'),
      JSON.stringify(snapshot, null, 2),
      'utf8'
    );
  }

  console.log('✅ Created 4 synthetic runs with realistic patterns\n');
  return testDir;
}

// Run the demo
const testDir = createSyntheticRuns();
const patterns = analyzePatterns(testDir, 'demo-site', 10);

console.log('🔍 PATTERN DETECTION DEMONSTRATION');
console.log('═'.repeat(70));
console.log(`Site: demo-site | Analyzed 4 runs from ${testDir}`);
console.log('═'.repeat(70) + '\n');

if (patterns.length === 0) {
  console.log('❌ No patterns detected (unexpected)\n');
} else {
  console.log(`✅ Detected ${patterns.length} patterns\n`);

  patterns.forEach((p, idx) => {
    const confEmoji = p.confidence === 'high' ? '🔴' : '🟡';
    console.log(`${confEmoji} Pattern ${idx+1}: ${p.type.replace(/_/g, ' ').toUpperCase()}`);
    console.log(`   Summary: ${p.summary}`);
    console.log(`   Impact: ${p.whyItMatters}`);
    console.log(`   Evidence:`);
    
    // Show specific evidence details
    Object.entries(p.evidence).forEach(([k, v]) => {
      if (k === 'runIds' && Array.isArray(v)) {
        console.log(`     • Occurred in: ${v.length} run(s)`);
      } else if (k === 'avgDurationMs') {
        console.log(`     • Average duration: ${v}ms`);
      } else if (k === 'failureRate') {
        console.log(`     • Failure rate: ${v}`);
      } else if (typeof v === 'number') {
        console.log(`     • ${k}: ${v}`);
      }
    });
    
    console.log(`   Confidence: ${p.confidence.toUpperCase()}`);
    console.log(`   Note: ${p.limits}`);
    console.log();
  });

  console.log('═'.repeat(70));
  console.log('\n📋 PATTERN INSIGHTS FOR THIS SITE:');
  console.log('───────────────────────────────────────────────────────────────────\n');

  const skipPattern = patterns.find(p => p.type === 'repeated_skipped_attempts');
  const frictionPattern = patterns.find(p => p.type === 'recurring_friction');
  const failurePattern = patterns.find(p => p.type === 'single_point_failure');
  const degradationPattern = patterns.find(p => p.type === 'confidence_degradation');

  if (skipPattern) {
    console.log('🚫 SKIPPED PATHS: Review payment is consistently skipped.');
    console.log('   → Consider enabling this path in your test policy, or document why');
    console.log('     it\'s intentionally excluded from evaluation.\n');
  }

  if (frictionPattern) {
    console.log('⏱️  FRICTION BOTTLENECK: Checkout shows friction in most runs.');
    console.log('   → Slow endpoints? Unreliable selectors? Network variability?');
    console.log('     Investigate and fix to improve user satisfaction.\n');
  }

  if (failurePattern) {
    console.log('🔗 SINGLE POINT OF FAILURE: MFA verification is a critical blocker.');
    console.log('   → Users cannot proceed past login. High priority fix.\n');
  }

  if (degradationPattern) {
    console.log('📉 CONFIDENCE TRENDING DOWN: Quality is degrading across runs.');
    console.log('   → New failures are emerging. Site may have a progressive issue.\n');
  }

  console.log('───────────────────────────────────────────────────────────────────');
}

console.log('\n✅ Stage V Pattern Detection - Demonstration Complete\n');
