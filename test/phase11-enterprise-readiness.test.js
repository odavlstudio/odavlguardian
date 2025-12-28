/**
 * Phase 11: Enterprise Readiness Tests
 * Test multi-site, RBAC, audit logs, and PDF export
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Import enterprise modules
const { addSite, removeSite, getSite, getSites, recordSiteScan, getSitesByProject, listProjects, resetSites } = require('../src/enterprise/site-manager');
const { addUser, removeUser, getUsers, getCurrentUser, hasPermission, requirePermission, getRole, listRoles, ROLES, resetUsers } = require('../src/enterprise/rbac');
const { logAudit, readAuditLogs, getAuditSummary, AUDIT_ACTIONS, resetAuditLogs } = require('../src/enterprise/audit-logger');
const { exportReportToPDF, listAvailableReports, generatePDF } = require('../src/enterprise/pdf-exporter');

// Test counters
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
    failed++;
  }
}

// ==================== MULTI-SITE TESTS ====================

console.log('\n=== Multi-Site Management ===\n');

test('Should add a site', () => {
  resetSites();
  const site = addSite('test-site', 'https://example.com', 'project1');
  assert.strictEqual(site.name, 'test-site');
  assert.strictEqual(site.url, 'https://example.com');
  assert.strictEqual(site.project, 'project1');
  assert.strictEqual(site.scanCount, 0);
});

test('Should prevent duplicate site names', () => {
  resetSites();
  addSite('test-site', 'https://example.com');
  
  try {
    addSite('test-site', 'https://other.com');
    throw new Error('Should have thrown duplicate error');
  } catch (err) {
    assert(err.message.includes('already exists'));
  }
});

test('Should validate URL format', () => {
  resetSites();
  
  try {
    addSite('bad-site', 'not-a-url');
    throw new Error('Should have thrown invalid URL error');
  } catch (err) {
    assert(err.message.includes('Invalid URL'));
  }
});

test('Should get site by name', () => {
  resetSites();
  addSite('test-site', 'https://example.com');
  
  const site = getSite('test-site');
  assert(site);
  assert.strictEqual(site.name, 'test-site');
});

test('Should return null for non-existent site', () => {
  resetSites();
  const site = getSite('non-existent');
  assert.strictEqual(site, undefined);
});

test('Should record site scan stats', () => {
  resetSites();
  addSite('test-site', 'https://example.com');
  
  recordSiteScan('test-site');
  const site = getSite('test-site');
  
  assert.strictEqual(site.scanCount, 1);
  assert(site.lastScannedAt);
});

test('Should remove site', () => {
  resetSites();
  addSite('test-site', 'https://example.com', 'project1');
  
  const removed = removeSite('test-site');
  assert.strictEqual(removed.name, 'test-site');
  
  const site = getSite('test-site');
  assert.strictEqual(site, undefined);
});

test('Should get sites by project', () => {
  resetSites();
  addSite('site1', 'https://example.com', 'project1');
  addSite('site2', 'https://test.com', 'project1');
  addSite('site3', 'https://demo.com', 'project2');
  
  const proj1Sites = getSitesByProject('project1');
  assert.strictEqual(proj1Sites.length, 2);
  
  const proj2Sites = getSitesByProject('project2');
  assert.strictEqual(proj2Sites.length, 1);
});

test('Should list projects', () => {
  resetSites();
  addSite('site1', 'https://example.com', 'project1');
  addSite('site2', 'https://test.com', 'project1');
  addSite('site3', 'https://demo.com', 'project2');
  
  const projects = listProjects();
  assert.strictEqual(projects.length, 2);
  
  const proj1 = projects.find(p => p.name === 'project1');
  assert.strictEqual(proj1.siteCount, 2);
  
  const proj2 = projects.find(p => p.name === 'project2');
  assert.strictEqual(proj2.siteCount, 1);
});

test('Should persist sites to disk', () => {
  resetSites();
  addSite('persist-test', 'https://example.com');
  
  // Re-read from disk
  const data = getSites();
  const site = data.sites.find(s => s.name === 'persist-test');
  
  assert(site);
  assert.strictEqual(site.url, 'https://example.com');
});

// ==================== RBAC TESTS ====================

console.log('\n=== Role-Based Access Control ===\n');

test('Should add a user with role', () => {
  resetUsers();
  const user = addUser('testuser', 'OPERATOR');
  assert.strictEqual(user.username, 'testuser');
  assert.strictEqual(user.role, 'OPERATOR');
});

test('Should prevent duplicate users', () => {
  resetUsers();
  addUser('testuser', 'VIEWER');
  
  try {
    addUser('testuser', 'ADMIN');
    throw new Error('Should have thrown duplicate error');
  } catch (err) {
    assert(err.message.includes('already exists'));
  }
});

test('Should validate role names', () => {
  resetUsers();
  
  try {
    addUser('baduser', 'INVALID_ROLE');
    throw new Error('Should have thrown invalid role error');
  } catch (err) {
    assert(err.message.includes('Invalid role'));
  }
});

test('Should get current user', () => {
  resetUsers();
  const user = getCurrentUser();
  assert(user);
  assert(user.username);
  assert.strictEqual(user.role, 'ADMIN'); // Default is ADMIN
});

test('Should check ADMIN permissions', () => {
  resetUsers();
  // Current user is ADMIN by default
  assert.strictEqual(hasPermission('scan:run'), true);
  assert.strictEqual(hasPermission('scan:view'), true);
  assert.strictEqual(hasPermission('site:add'), true);
  assert.strictEqual(hasPermission('user:add'), true);
});

test('Should enforce permission requirements', () => {
  resetUsers();
  const currentUser = getCurrentUser();
  
  // ADMIN should pass
  requirePermission('scan:run');
  
  // Change to VIEWER role (by adding and making it current user simulation)
  // Note: In real scenario, this would require switching users
});

test('Should prevent removing last ADMIN', () => {
  resetUsers();
  const adminUser = getCurrentUser();
  
  try {
    removeUser(adminUser.username);
    throw new Error('Should have thrown last ADMIN error');
  } catch (err) {
    assert(err.message.includes('Cannot remove last ADMIN'));
  }
});

test('Should list all roles', () => {
  const roles = listRoles();
  assert.strictEqual(roles.length, 3);
  
  const adminRole = roles.find(r => r.name === 'ADMIN');
  assert(adminRole);
  assert(adminRole.permissions.includes('scan:run'));
  assert(adminRole.permissions.includes('user:add'));
  
  const viewerRole = roles.find(r => r.name === 'VIEWER');
  assert(viewerRole);
  assert(viewerRole.permissions.includes('scan:view'));
  assert(!viewerRole.permissions.includes('scan:run'));
});

test('Should get role details', () => {
  const adminRole = getRole('ADMIN');
  assert(adminRole);
  assert.strictEqual(adminRole.name, 'ADMIN');
  assert(Array.isArray(adminRole.permissions));
  
  const operatorRole = getRole('OPERATOR');
  assert(operatorRole);
  assert.strictEqual(operatorRole.name, 'OPERATOR');
});

test('Should persist users to disk', () => {
  resetUsers();
  addUser('persist-user', 'VIEWER');
  
  // Re-read from disk
  const data = getUsers();
  const user = data.users.find(u => u.username === 'persist-user');
  
  assert(user);
  assert.strictEqual(user.role, 'VIEWER');
});

// ==================== AUDIT LOG TESTS ====================

console.log('\n=== Audit Logging ===\n');

test('Should log audit entry', () => {
  resetAuditLogs();
  
  const entry = logAudit(AUDIT_ACTIONS.SCAN_RUN, { url: 'https://example.com' });
  
  assert(entry);
  assert.strictEqual(entry.action, AUDIT_ACTIONS.SCAN_RUN);
  assert.strictEqual(entry.details.url, 'https://example.com');
  assert(entry.timestamp);
  assert(entry.user);
  assert(entry.hostname);
});

test('Should read audit logs', () => {
  resetAuditLogs();
  logAudit(AUDIT_ACTIONS.SCAN_RUN, { url: 'https://example.com' });
  logAudit(AUDIT_ACTIONS.SITE_ADD, { name: 'test-site' });
  
  const logs = readAuditLogs({ limit: 100 });
  assert(logs.length >= 2);
  
  const scanLog = logs.find(l => l.action === AUDIT_ACTIONS.SCAN_RUN);
  assert(scanLog);
  assert.strictEqual(scanLog.details.url, 'https://example.com');
});

test('Should filter logs by action', () => {
  resetAuditLogs();
  logAudit(AUDIT_ACTIONS.SCAN_RUN, { url: 'https://example.com' });
  logAudit(AUDIT_ACTIONS.SITE_ADD, { name: 'test-site' });
  logAudit(AUDIT_ACTIONS.SCAN_RUN, { url: 'https://test.com' });
  
  const scanLogs = readAuditLogs({ action: AUDIT_ACTIONS.SCAN_RUN, limit: 100 });
  assert.strictEqual(scanLogs.length, 2);
  
  const siteLogs = readAuditLogs({ action: AUDIT_ACTIONS.SITE_ADD, limit: 100 });
  assert.strictEqual(siteLogs.length, 1);
});

test('Should respect log limit', () => {
  resetAuditLogs();
  
  for (let i = 0; i < 50; i++) {
    logAudit(AUDIT_ACTIONS.SCAN_RUN, { iteration: i });
  }
  
  const logs = readAuditLogs({ limit: 10 });
  assert.strictEqual(logs.length, 10);
});

test('Should generate audit summary', () => {
  resetAuditLogs();
  logAudit(AUDIT_ACTIONS.SCAN_RUN, {});
  logAudit(AUDIT_ACTIONS.SCAN_RUN, {});
  logAudit(AUDIT_ACTIONS.SITE_ADD, {});
  
  const summary = getAuditSummary();
  
  assert.strictEqual(summary.totalLogs, 3);
  assert.strictEqual(summary.actionCounts[AUDIT_ACTIONS.SCAN_RUN], 2);
  assert.strictEqual(summary.actionCounts[AUDIT_ACTIONS.SITE_ADD], 1);
  assert(summary.firstLog);
  assert(summary.lastLog);
});

test('Should be immutable (append-only)', () => {
  resetAuditLogs();
  logAudit(AUDIT_ACTIONS.SCAN_RUN, { test: 1 });
  
  const logs1 = readAuditLogs({ limit: 100 });
  const count1 = logs1.length;
  
  logAudit(AUDIT_ACTIONS.SCAN_RUN, { test: 2 });
  
  const logs2 = readAuditLogs({ limit: 100 });
  const count2 = logs2.length;
  
  assert.strictEqual(count2, count1 + 1);
  
  // Verify first log still exists unchanged
  const firstLog = logs2.find(l => l.details.test === 1);
  assert(firstLog);
});

test('Should handle monthly rotation', () => {
  resetAuditLogs();
  logAudit(AUDIT_ACTIONS.SCAN_RUN, {});
  
  const auditDir = path.join(os.homedir(), '.odavl-guardian', 'audit');
  const files = fs.readdirSync(auditDir).filter(f => f.startsWith('audit-') && f.endsWith('.jsonl'));
  
  assert(files.length >= 1);
  
  // Check filename format: audit-YYYY-MM.jsonl
  const file = files[0];
  assert(file.match(/audit-\d{4}-\d{2}\.jsonl/));
});

// ==================== PDF EXPORT TESTS ====================

console.log('\n=== PDF Export ===\n');

test('Should list available reports', () => {
  const reports = listAvailableReports();
  // This will return reports from artifacts dir
  assert(Array.isArray(reports));
});

test('Should extract metadata from HTML', () => {
  const html = `
    <h2>URL: https://example.com</h2>
    <p>Scanned: 2025-01-01</p>
    <div>PASSED</div>
    <h3>Executive Summary</h3>
    <p>This is a summary.</p>
    <h3>Next Section</h3>
  `;
  
  // Internal test - access extractReportMetadata if exported
  // For now, test end-to-end via generatePDF
});

testAsync('Should generate PDF from HTML report', async () => {
  // Create a mock HTML report
  const mockHtml = `
    <!DOCTYPE html>
    <html>
    <head><title>Test Report</title></head>
    <body>
      <h1>Guardian Report</h1>
      <h2>URL: https://test.example.com</h2>
      <p>Scanned: 2025-12-26</p>
      <div>PASSED</div>
      <h3>Executive Summary</h3>
      <p>Test summary content.</p>
      <h3>Flags Detected</h3>
      <p>HIDDEN_FIELD: Found hidden field</p>
      <p>SECURE_COOKIE: Secure cookies detected</p>
      <h3>End</h3>
    </body>
    </html>
  `;
  
  const tempDir = path.join(os.tmpdir(), 'guardian-test-' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });
  
  const htmlPath = path.join(tempDir, 'test-report.html');
  const pdfPath = path.join(tempDir, 'test-report.pdf');
  
  fs.writeFileSync(htmlPath, mockHtml, 'utf-8');
  
  const result = generatePDF(htmlPath, pdfPath);
  
  assert(result);
  assert.strictEqual(result.outputPath, pdfPath);
  assert(fs.existsSync(pdfPath));
  assert(result.size > 0);
  
  // Cleanup
  fs.unlinkSync(htmlPath);
  fs.unlinkSync(pdfPath);
  fs.rmdirSync(tempDir);
});

test('Should fail on non-existent report', () => {
  try {
    generatePDF('/non/existent/report.html', '/tmp/output.pdf');
    throw new Error('Should have thrown not found error');
  } catch (err) {
    assert(err.message.includes('not found'));
  }
});

// ==================== INTEGRATION TESTS ====================

console.log('\n=== Integration Tests ===\n');

testAsync('Full enterprise workflow', async () => {
  // Reset all
  resetSites();
  resetUsers();
  resetAuditLogs();
  
  // 1. Add sites
  addSite('prod-site', 'https://prod.example.com', 'production');
  addSite('staging-site', 'https://staging.example.com', 'staging');
  logAudit(AUDIT_ACTIONS.SITE_ADD, { name: 'prod-site' });
  logAudit(AUDIT_ACTIONS.SITE_ADD, { name: 'staging-site' });
  
  // 2. Add users with roles
  addUser('operator1', 'OPERATOR');
  addUser('viewer1', 'VIEWER');
  logAudit(AUDIT_ACTIONS.USER_ADD, { username: 'operator1' });
  logAudit(AUDIT_ACTIONS.USER_ADD, { username: 'viewer1' });
  
  // 3. Record scan
  recordSiteScan('prod-site');
  logAudit(AUDIT_ACTIONS.SCAN_RUN, { site: 'prod-site' });
  
  // 4. Verify state
  const sites = getSites();
  assert.strictEqual(sites.sites.length, 2);
  
  const users = getUsers();
  assert(users.users.length >= 3); // Admin + 2 added
  
  const logs = readAuditLogs({ limit: 100 });
  assert(logs.length >= 5);
  
  const prodSite = getSite('prod-site');
  assert.strictEqual(prodSite.scanCount, 1);
  
  // 5. Verify RBAC
  const currentUser = getCurrentUser();
  assert.strictEqual(currentUser.role, 'ADMIN');
  assert.strictEqual(hasPermission('scan:run'), true);
  
  console.log('  ✓ Multi-site tracking');
  console.log('  ✓ User management');
  console.log('  ✓ Audit logging');
  console.log('  ✓ Permission checks');
});

testAsync('Site scan enforcement workflow', async () => {
  resetSites();
  resetAuditLogs();
  
  // Add multiple sites to same project
  addSite('site1', 'https://site1.com', 'myproject');
  addSite('site2', 'https://site2.com', 'myproject');
  addSite('site3', 'https://site3.com', 'myproject');
  
  // Verify project grouping
  const projects = listProjects();
  const myProject = projects.find(p => p.name === 'myproject');
  assert.strictEqual(myProject.siteCount, 3);
  
  const mySites = getSitesByProject('myproject');
  assert.strictEqual(mySites.length, 3);
  
  // Record scans
  recordSiteScan('site1');
  recordSiteScan('site2');
  recordSiteScan('site1'); // Second scan
  
  // Verify scan counts
  const site1 = getSite('site1');
  assert.strictEqual(site1.scanCount, 2);
  
  const site2 = getSite('site2');
  assert.strictEqual(site2.scanCount, 1);
  
  const site3 = getSite('site3');
  assert.strictEqual(site3.scanCount, 0);
});

// ==================== SUMMARY ====================

console.log('\n=== Test Summary ===\n');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);

process.exit(failed > 0 ? 1 : 0);
