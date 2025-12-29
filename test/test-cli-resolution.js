// Quick test of CLI resolution logic
const path = require('path');
const fs = require('fs');

const workspaceRoot = 'C:\\Users\\sabou\\odavlguardian';
const GUARDIAN_ARTIFACTS_DIR = '.guardian';
const url = 'https://example.com';

function resolveGuardianCommand(workspaceRoot, url) {
  const artifactsDir = path.join(workspaceRoot, GUARDIAN_ARTIFACTS_DIR);
  
  try {
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }
  } catch (e) {}

  const baseArgs = ['reality', '--url', url, '--artifacts', artifactsDir];

  // 1) Workspace local: node_modules/.bin/guardian
  const nodeBinGuardian = path.join(workspaceRoot, 'node_modules', '.bin', 'guardian');
  if (fs.existsSync(nodeBinGuardian)) {
    return { command: nodeBinGuardian, args: baseArgs, cwd: workspaceRoot, source: 'node_modules/.bin/guardian' };
  }

  // 2) Repo root: guardian.js (root shim) or bin/guardian.js
  const rootGuardian = path.join(workspaceRoot, 'guardian.js');
  if (fs.existsSync(rootGuardian)) {
    return { command: 'node', args: [rootGuardian, ...baseArgs], cwd: workspaceRoot, source: 'root guardian.js' };
  }

  const binGuardian = path.join(workspaceRoot, 'bin', 'guardian.js');
  if (fs.existsSync(binGuardian)) {
    return { command: 'node', args: [binGuardian, ...baseArgs], cwd: workspaceRoot, source: 'bin/guardian.js' };
  }

  // 3) Global guardian
  return { command: 'guardian', args: baseArgs, cwd: workspaceRoot, source: 'global guardian' };
}

const resolved = resolveGuardianCommand(workspaceRoot, url);
console.log('CLI Resolution Test:');
console.log('Source:', resolved.source);
console.log('Command:', resolved.command);
console.log('Args:', resolved.args.join(' '));
console.log('CWD:', resolved.cwd);
console.log('');
console.log('Full command:', resolved.command, resolved.args.join(' '));
