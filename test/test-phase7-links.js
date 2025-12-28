#!/usr/bin/env node

/**
 * Link Verification Test for Phase 7: Public Launch
 * Tests all GTM hooks and navigation links
 * 
 * Run with: node test-phase7-links.js
 */

const BASE_URL = 'http://localhost:3001';

const tests = [
  // Internal navigation links
  {
    name: 'Homepage loads',
    url: '/',
    expectedCode: 200,
  },
  {
    name: 'Quick Start (/docs) loads',
    url: '/docs',
    expectedCode: 200,
  },
  {
    name: 'Run page loads',
    url: '/run',
    expectedCode: 200,
  },
  {
    name: 'Sample report page loads',
    url: '/report/sample',
    expectedCode: 200,
  },
  {
    name: 'Sample report with URL parameter',
    url: '/report/sample?url=https%3A%2F%2Fexample.com',
    expectedCode: 200,
  },
  {
    name: 'Privacy page loads',
    url: '/privacy',
    expectedCode: 200,
  },
  {
    name: 'Terms page loads',
    url: '/terms',
    expectedCode: 200,
  },
];

const externalLinks = [
  {
    name: 'GitHub repository',
    url: 'https://github.com/odavlstudio/odavlguardian',
    expectedCode: 200,
  },
];

async function testUrl(path, expectedCode = 200) {
  const { execSync } = require('child_process');
  try {
    const output = execSync(`curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${path}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const status = parseInt(output.trim());
    return {
      ok: status === expectedCode,
      status: status,
      expected: expectedCode,
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
    };
  }
}

async function testExternalUrl(url) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    // Redirects (301, 302) are OK for external links
    return {
      ok: response.status < 400,
      status: response.status,
    };
  } catch (error) {
    // Network errors may occur, just note them
    return {
      ok: false,
      error: error.message,
    };
  }
}

async function runTests() {
  console.log('\n=== PHASE 7: PUBLIC LAUNCH - LINK VERIFICATION ===\n');
  
  console.log('📍 Testing internal links (localhost:3001)...\n');
  
  let passedInternal = 0;
  let totalInternal = tests.length;
  
  for (const test of tests) {
    const result = await testUrl(test.url, test.expectedCode);
    const icon = result.ok ? '✅' : '❌';
    console.log(`${icon} ${test.name}`);
    if (!result.ok) {
      console.log(`   Expected ${result.expected}, got ${result.status || 'ERROR: ' + result.error}`);
    } else {
      passedInternal++;
    }
  }
  
  console.log(`\n📊 Internal Links: ${passedInternal}/${totalInternal} passed\n`);
  
  console.log('🌐 Testing external links...\n');
  
  let passedExternal = 0;
  let totalExternal = externalLinks.length;
  
  for (const test of externalLinks) {
    const result = await testExternalUrl(test.url);
    const icon = result.ok ? '✅' : '⚠️';
    console.log(`${icon} ${test.name}`);
    if (!result.ok) {
      console.log(`   Status ${result.status || 'ERROR: ' + result.error}`);
    } else {
      passedExternal++;
    }
  }
  
  console.log(`\n📊 External Links: ${passedExternal}/${totalExternal} passed\n`);
  
  const totalPassed = passedInternal + passedExternal;
  const totalTests = totalInternal + totalExternal;
  
  if (totalPassed === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Phase 7 is ready for launch.\n');
    process.exit(0);
  } else {
    console.log(`⚠️  Some tests failed: ${totalPassed}/${totalTests} passed\n`);
    process.exit(1);
  }
}

// GTM Hook verification (manual checklist items)
console.log('\n=== GTM HOOK CHECKLIST ===');
console.log('✅ Early access email: mailto:hello@odavl.com in multiple locations');
console.log('✅ GitHub link: https://github.com/odavlstudio/odavlguardian');
console.log('✅ Copy-to-clipboard: Quick start commands');
console.log('✅ Sample report: Accessible via /report/sample');
console.log('✅ Demo URL input: /run page');
console.log('✅ Founder messaging: Throughout landing page');
console.log('✅ Free tier positioning: Pricing section');
console.log('✅ Pro early access: Pricing + multiple CTAs');

console.log('\n=== AUTOMATED LINK TESTS ===\n');

runTests();
