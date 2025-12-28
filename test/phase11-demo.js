#!/usr/bin/env node
/**
 * Phase 11: Full Enterprise Demo
 * Demonstrates complete enterprise workflow
 */

console.log('🏢 Guardian Enterprise Demo\n');
console.log('This demo shows a complete enterprise workflow:');
console.log('- Multi-site management across projects');
console.log('- Team member roles and permissions');
console.log('- Audit logging for compliance');
console.log('- Report export capabilities\n');

const { execSync } = require('child_process');

function run(cmd, description) {
  console.log(`\n📌 ${description}`);
  console.log(`   Command: guardian ${cmd}\n`);
  
  try {
    const output = execSync(`node bin/guardian.js ${cmd}`, {
      encoding: 'utf-8',
      cwd: __dirname + '/..'
    });
    console.log(output);
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
}

// Clear state for demo
console.log('📋 Setup: Clearing previous data...\n');
const { resetSites } = require('../src/enterprise/site-manager');
const { resetUsers } = require('../src/enterprise/rbac');
const { resetAuditLogs } = require('../src/enterprise/audit-logger');

resetSites();
resetUsers();
resetAuditLogs();

console.log('✅ Ready for demo\n');
console.log('━'.repeat(60));

// 1. Multi-Site Setup
console.log('\n\n🌐 PHASE 1: Multi-Site Setup\n');
run('sites add prod-web https://app.example.com --project production', 'Add production website');
run('sites add prod-api https://api.example.com --project production', 'Add production API');
run('sites add staging-web https://staging.example.com --project staging', 'Add staging site');
run('sites', 'View all sites (grouped by project)');

// 2. Team Setup
console.log('\n\n👥 PHASE 2: Team Management\n');
run('users add alice OPERATOR', 'Add Alice as Operator');
run('users add bob VIEWER', 'Add Bob as Viewer');
run('users', 'View team members');
run('users roles', 'View available roles');

// 3. Audit Logs
console.log('\n\n📊 PHASE 3: Audit Trail\n');
run('audit', 'View recent activity');
run('audit summary', 'View audit summary');

// 4. Report Export
console.log('\n\n📄 PHASE 4: Report Export\n');
run('export', 'List available reports');

console.log('\n\n━'.repeat(60));
console.log('\n✅ Demo Complete!\n');
console.log('Enterprise features demonstrated:');
console.log('  ✓ Multi-site management with projects');
console.log('  ✓ Team roles (ADMIN, OPERATOR, VIEWER)');
console.log('  ✓ Complete audit trail');
console.log('  ✓ Report export capabilities\n');
console.log('Data stored locally in: ~/.odavl-guardian/\n');
