/**
 * Phase 11 Quick Verification
 * Quick smoke test for enterprise features
 */

const { addSite, getSite, getSites, resetSites } = require('../src/enterprise/site-manager');
const { addUser, getCurrentUser, hasPermission, resetUsers } = require('../src/enterprise/rbac');
const { logAudit, readAuditLogs, AUDIT_ACTIONS, resetAuditLogs } = require('../src/enterprise/audit-logger');

console.log('🧪 Phase 11: Enterprise Readiness Quick Verification\n');

// Reset state
resetSites();
resetUsers();
resetAuditLogs();

try {
  // 1. Multi-Site
  console.log('1️⃣  Testing multi-site management...');
  addSite('test-site', 'https://example.com', 'test-project');
  const site = getSite('test-site');
  if (!site || site.name !== 'test-site') {
    throw new Error('Site management failed');
  }
  console.log('   ✅ Site added and retrieved');

  // 2. RBAC
  console.log('\n2️⃣  Testing RBAC...');
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    throw new Error('Current user should be ADMIN');
  }
  
  if (!hasPermission('scan:run')) {
    throw new Error('ADMIN should have scan:run permission');
  }
  console.log('   ✅ Current user:', currentUser.username, '(ADMIN)');
  console.log('   ✅ Permissions verified');

  // 3. Audit Logs
  console.log('\n3️⃣  Testing audit logging...');
  logAudit(AUDIT_ACTIONS.SITE_ADD, { name: 'test-site' });
  logAudit(AUDIT_ACTIONS.SCAN_RUN, { url: 'https://example.com' });
  
  const logs = readAuditLogs({ limit: 10 });
  if (logs.length < 2) {
    throw new Error('Audit logs not recorded');
  }
  console.log('   ✅ Logged', logs.length, 'actions');

  // 4. Integration
  console.log('\n4️⃣  Testing integration...');
  addUser('test-operator', 'OPERATOR');
  logAudit(AUDIT_ACTIONS.USER_ADD, { username: 'test-operator' });
  
  const data = getSites();
  if (data.sites.length !== 1) {
    throw new Error('Expected 1 site');
  }
  
  const summary = readAuditLogs({ limit: 100 });
  if (summary.length < 3) {
    throw new Error('Expected at least 3 audit logs');
  }
  
  console.log('   ✅ Sites:', data.sites.length);
  console.log('   ✅ Audit logs:', summary.length);
  console.log('   ✅ User roles working');

  console.log('\n🎉 Phase 11 fully functional!\n');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Verification failed:', error.message);
  process.exit(1);
}
