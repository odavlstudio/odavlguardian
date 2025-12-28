/**
 * Phase 12.2: Recipe Marketplace & Sharing (Local-first)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const {
  resetCustomRecipes,
  addRecipe,
  getRecipe,
  importRecipeWithMetadata,
  exportRecipeWithMetadata,
  removeRecipe,
} = require('../src/recipes/recipe-store');
const {
  computeRecipeChecksum,
  loadRegistry,
  getRegistryEntry,
  resetRegistry,
} = require('../src/recipes/recipe-registry');
const { resetUsers } = require('../src/enterprise/rbac');
const { resetAuditLogs, readAuditLogs, AUDIT_ACTIONS } = require('../src/enterprise/audit-logger');

function setupViewerUser() {
  const rbacDir = path.join(os.homedir(), '.odavl-guardian', 'rbac');
  const usersFile = path.join(rbacDir, 'users.json');
  if (!fs.existsSync(rbacDir)) {
    fs.mkdirSync(rbacDir, { recursive: true });
  }
  const current = os.userInfo().username || 'user';
  const data = {
    users: [
      { username: current, role: 'VIEWER', addedAt: new Date().toISOString() },
      { username: 'admin-alt', role: 'ADMIN', addedAt: new Date().toISOString() },
    ],
  };
  fs.writeFileSync(usersFile, JSON.stringify(data, null, 2), 'utf-8');
}

function resetState() {
  resetCustomRecipes();
  resetRegistry();
  resetUsers();
  resetAuditLogs();
}

console.log('\n=== Recipe Marketplace & Sharing ===\n');

// Registry read/write and built-in registration
(function testRegistryBuiltIns() {
  resetState();
  // Trigger registry seeding via list of all recipes
  require('../src/recipes/recipe-store').getAllRecipes();
  const registry = loadRegistry();
  assert(registry.entries.length >= 3, 'Registry should include built-ins');
  const entry = getRegistryEntry('shopify-checkout');
  assert(entry);
  assert.strictEqual(entry.source, 'builtin');
})();

// Export/import integrity roundtrip
(function testExportImportRoundtrip() {
  resetState();
  const recipe = {
    id: 'market-roundtrip',
    name: 'Marketplace Roundtrip',
    platform: 'saas',
    version: '1.2.3',
    intent: 'Verify roundtrip',
    steps: ['Step 1', 'Step 2'],
    expectedGoal: 'Done',
  };
  addRecipe(recipe);
  const tmpFile = path.join(os.tmpdir(), `recipe-export-${Date.now()}.json`);
  try {
    const exportResult = exportRecipeWithMetadata(recipe.id, tmpFile);
    const raw = JSON.parse(fs.readFileSync(tmpFile, 'utf-8'));
    const checksum = computeRecipeChecksum(raw.recipe);
    assert.strictEqual(exportResult.checksum, checksum);
    resetCustomRecipes();
    resetRegistry();
    const importResult = importRecipeWithMetadata(tmpFile, { force: true });
    assert.strictEqual(importResult.recipe.id, recipe.id);
    const reg = getRegistryEntry(recipe.id);
    assert(reg);
    assert.strictEqual(reg.checksum, checksum);
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
})();

// Collision handling with force flag
(function testCollisionHandling() {
  resetState();
  const recipe = {
    id: 'collision-case',
    name: 'Collision Original',
    platform: 'landing',
    intent: 'Original',
    steps: ['A'],
    expectedGoal: 'Ok',
  };
  addRecipe(recipe);
  const overwrite = {
    id: 'collision-case',
    name: 'Collision Overwrite',
    platform: 'landing',
    intent: 'Overwrite',
    steps: ['B'],
    expectedGoal: 'Ok',
  };
  const tmpFile = path.join(os.tmpdir(), `collision-${Date.now()}.json`);
  fs.writeFileSync(tmpFile, JSON.stringify({ recipe: overwrite, checksum: computeRecipeChecksum(overwrite) }, null, 2), 'utf-8');
  try {
    let threw = false;
    try {
      importRecipeWithMetadata(tmpFile, { force: false });
    } catch (err) {
      threw = true;
    }
    assert(threw, 'Import without force should fail on collision');
    const result = importRecipeWithMetadata(tmpFile, { force: true });
    assert.strictEqual(result.recipe.name, 'Collision Overwrite');
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
})();

// RBAC enforcement for import/export
(function testRbacEnforcement() {
  resetState();
  setupViewerUser();
  const tmpFile = path.join(os.tmpdir(), `rbac-export-${Date.now()}.json`);
  const run = spawnSync('node', ['bin/guardian.js', 'recipe', 'export', 'landing-contact', '--out', tmpFile], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf-8',
  });
  assert.notStrictEqual(run.status, 0, 'Export should be denied for VIEWER');
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
})();

// Audit log entries for import/export
(function testAuditLogging() {
  resetState();
  const exportFile = path.join(os.tmpdir(), `audit-export-${Date.now()}.json`);
  const importFile = path.join(os.tmpdir(), `audit-import-${Date.now()}.json`);
  const sample = {
    id: 'audit-import',
    name: 'Audit Import',
    platform: 'saas',
    intent: 'Audit',
    steps: ['1'],
    expectedGoal: 'OK',
  };
  fs.writeFileSync(importFile, JSON.stringify({ recipe: sample, checksum: computeRecipeChecksum(sample) }, null, 2), 'utf-8');
  try {
    // Export built-in
    let res = spawnSync('node', ['bin/guardian.js', 'recipe', 'export', 'landing-contact', '--out', exportFile], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
    });
    assert.strictEqual(res.status, 0, 'Export should succeed for ADMIN');
    // Import sample
    res = spawnSync('node', ['bin/guardian.js', 'recipe', 'import', importFile, '--force'], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
    });
    assert.strictEqual(res.status, 0, 'Import should succeed for ADMIN');
    const logs = readAuditLogs({ limit: 10 });
    const actions = logs.map(l => l.action);
    assert(actions.includes(AUDIT_ACTIONS.RECIPE_EXPORT));
    assert(actions.includes(AUDIT_ACTIONS.RECIPE_IMPORT));
  } finally {
    if (fs.existsSync(exportFile)) fs.unlinkSync(exportFile);
    if (fs.existsSync(importFile)) fs.unlinkSync(importFile);
  }
})();

console.log('\n=== Marketplace tests completed ===\n');
