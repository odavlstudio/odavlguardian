import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

let outputChannel: vscode.OutputChannel;
let isRunning = false;

const LAST_URL_KEY = 'odavlGuardian.lastUrl';
const GUARDIAN_ARTIFACTS_DIR = '.odavlguardian';

function getWorkspaceRoot(): string | null {
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    return vscode.workspace.workspaceFolders[0].uri.fsPath;
  }
  return null;
}

export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel('Guardian');
  
  outputChannel.appendLine('ODAVL Guardian: Market Reality Testing');
  outputChannel.appendLine(`Version: ${context.extension.packageJSON.version}`);
  outputChannel.appendLine('');
  outputChannel.appendLine('Quick start: Command Palette → "Guardian: Run Reality Check"');
  outputChannel.appendLine('');
  
  context.subscriptions.push(outputChannel);
  
  // PRIMARY COMMAND: Run Guardian Reality Check
  const runRealityCheckCommand = vscode.commands.registerCommand(
    'odavlGuardian.runRealityCheck',
    async () => {
      // Ensure workspace is open
      const workspaceRoot = getWorkspaceRoot();
      if (!workspaceRoot) {
        vscode.window.showErrorMessage('Guardian: Open a workspace folder to run a reality check.');
        return;
      }

      if (isRunning) {
        vscode.window.showWarningMessage('Guardian is already running. Please wait for it to complete.');
        return;
      }

      // Ask for URL (with smart defaults)
      const lastUrl = context.globalState.get<string>(LAST_URL_KEY);
      const url = await vscode.window.showInputBox({
        prompt: 'Enter the URL to test (e.g., https://example.com)',
        placeHolder: 'https://example.com',
        value: lastUrl || '',
        validateInput: (value: string) => {
          const trimmed = value.trim();
          if (!trimmed) return 'URL cannot be empty';
          try {
            new URL(trimmed); // Validate URL format
            return null;
          } catch {
            return 'Invalid URL format. Example: https://example.com';
          }
        }
      });

      if (!url) return; // User cancelled

      const trimmedUrl = url.trim();
      isRunning = true;
      await context.globalState.update(LAST_URL_KEY, trimmedUrl);
      
      outputChannel.show(true);
      outputChannel.appendLine('');
      outputChannel.appendLine('═'.repeat(80));
      outputChannel.appendLine(`🔍 Guardian Reality Check`);
      outputChannel.appendLine(`   URL: ${trimmedUrl}`);
      outputChannel.appendLine(`   Workspace: ${workspaceRoot}`);
      outputChannel.appendLine(`   Artifacts: ${path.join(workspaceRoot, GUARDIAN_ARTIFACTS_DIR)}`);
      outputChannel.appendLine('═'.repeat(80));
      outputChannel.appendLine('');

      // Show progress
      const progressPromise = vscode.window.withProgress(
        { 
          location: vscode.ProgressLocation.Notification,
          title: `Testing ${new URL(trimmedUrl).hostname}...`,
          cancellable: false
        },
        async () => {
          return new Promise<void>((resolve) => {
            // Resolve Guardian CLI
            const resolved = resolveGuardianCommand(workspaceRoot, trimmedUrl);
            if ('error' in resolved && resolved.error) {
              outputChannel.appendLine(`❌ Error: ${resolved.error}`);
              if (resolved.remediation) {
                outputChannel.appendLine('\nRemedy:');
                resolved.remediation.forEach(step => outputChannel.appendLine(`  • ${step}`));
              }
              vscode.window.showErrorMessage(resolved.error);
              isRunning = false;
              resolve();
              return;
            }

            const cmd = resolved as { command: string; args: string[]; cwd: string; source: string };
            outputChannel.appendLine(`[${cmd.source}]`);
            outputChannel.appendLine('');

            const guardianProcess = spawn(cmd.command, cmd.args, {
              shell: true,
              cwd: cmd.cwd,
              stdio: ['pipe', 'pipe', 'pipe']
            });

            if (!guardianProcess) {
              outputChannel.appendLine('❌ Failed to start Guardian CLI');
              vscode.window.showErrorMessage('Guardian: Failed to start CLI');
              isRunning = false;
              resolve();
              return;
            }

            guardianProcess.stdout?.on('data', (data: Buffer) => {
              outputChannel.append(data.toString());
            });

            guardianProcess.stderr?.on('data', (data: Buffer) => {
              outputChannel.append(data.toString());
            });

            guardianProcess.on('error', (error: NodeJS.ErrnoException) => {
              outputChannel.appendLine('\n❌ Process error: ' + error.message);
              if (error.code === 'ENOENT') {
                vscode.window.showErrorMessage(
                  'Guardian CLI not found. Install it with: npm install -g @odavl/guardian'
                );
              } else {
                vscode.window.showErrorMessage(`Guardian: ${error.message}`);
              }
              isRunning = false;
              resolve();
            });

            guardianProcess.on('close', async (code: number | null) => {
              outputChannel.appendLine('');
              outputChannel.appendLine('═'.repeat(80));
              
              // Display verdict and offer next steps
              await displayVerdict(workspaceRoot, code, outputChannel);
              isRunning = false;
              resolve();
            });
          });
        }
      );

      await progressPromise;
    }
  );

  context.subscriptions.push(runRealityCheckCommand);
  
  // SECONDARY COMMAND: Open Last Report (convenience)
  const openLastReportCommand = vscode.commands.registerCommand(
    'odavlGuardian.openLastReport',
    async () => {
      const workspaceRoot = getWorkspaceRoot();
      if (!workspaceRoot) {
        vscode.window.showErrorMessage('Guardian: Open a workspace folder first.');
        return;
      }

      const artifactsPath = path.join(workspaceRoot, GUARDIAN_ARTIFACTS_DIR);
      if (!fs.existsSync(artifactsPath)) {
        vscode.window.showInformationMessage('No Guardian reports yet. Run a reality check first.');
        return;
      }

      try {
        const latest = findLatestReport(artifactsPath);
        if (!latest) {
          vscode.window.showInformationMessage('No Guardian reports found.');
          return;
        }

        const doc = await vscode.workspace.openTextDocument(latest.path);
        await vscode.window.showTextDocument(doc);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to open report: ${msg}`);
      }
    }
  );

  context.subscriptions.push(openLastReportCommand);
  
  outputChannel.appendLine('✅ Guardian extension ready');
}

function findLatestReport(dir: string): { path: string; mtime: number } | null {
  const candidates: Array<{ path: string; mtime: number }> = [];

  function scan(currentDir: string): void {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (entry.isFile()) {
          // Prefer summary.md, then summary.txt, then decision.json
          if ((entry.name === 'summary.md' || entry.name === 'summary.txt' || entry.name === 'decision.json') && 
              (entry.name !== 'decision.json' || candidates.length === 0 || !candidates.some(c => c.path.endsWith('summary.md') || c.path.endsWith('summary.txt')))) {
            try {
              const stats = fs.statSync(fullPath);
              candidates.push({ path: fullPath, mtime: stats.mtimeMs });
            } catch (_) {}
          }
        }
      }
    } catch (_) {}
  }

  scan(dir);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.mtime - a.mtime);
  return candidates[0];
}

function resolveGuardianCommand(workspaceRoot: string, url: string): 
  ({ command: string; args: string[]; cwd: string; source: string } | 
   { error: string; remediation?: string[] }) {
  
  const cfg = vscode.workspace.getConfiguration('odavlGuardian');
  const artifactsDir = path.join(workspaceRoot, GUARDIAN_ARTIFACTS_DIR);
  
  // Ensure artifacts directory exists
  try {
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }
  } catch (e) {
    // Fallback if directory creation fails
  }

  const baseArgs = ['reality', '--url', url, '--artifacts', artifactsDir];

  // 1) Explicit config path
  const explicitPath = cfg.get<string>('binaryPath');
  if (explicitPath && explicitPath.trim().length > 0) {
    const p = explicitPath.trim();
    if (p.endsWith('.js')) {
      return { command: 'node', args: [p, ...baseArgs], cwd: workspaceRoot, source: 'config.binaryPath (explicit)' };
    }
    return { command: p, args: baseArgs, cwd: workspaceRoot, source: 'config.binaryPath (explicit)' };
  }

  // 2) Workspace local: node_modules/.bin/guardian
  const nodeBinGuardian = path.join(workspaceRoot, 'node_modules', '.bin', 'guardian');
  if (fs.existsSync(nodeBinGuardian)) {
    return { command: nodeBinGuardian, args: baseArgs, cwd: workspaceRoot, source: 'node_modules/.bin/guardian' };
  }

  // 3) Repo root: guardian.js (root shim) or bin/guardian.js
  const rootGuardian = path.join(workspaceRoot, 'guardian.js');
  if (fs.existsSync(rootGuardian)) {
    return { command: 'node', args: [rootGuardian, ...baseArgs], cwd: workspaceRoot, source: 'root guardian.js' };
  }

  const binGuardian = path.join(workspaceRoot, 'bin', 'guardian.js');
  if (fs.existsSync(binGuardian)) {
    return { command: 'node', args: [binGuardian, ...baseArgs], cwd: workspaceRoot, source: 'bin/guardian.js' };
  }

  // 4) Global guardian
  return { command: 'guardian', args: baseArgs, cwd: workspaceRoot, source: 'global guardian' };
}

async function displayVerdict(workspaceRoot: string, exitCode: number | null, outputChannel: vscode.OutputChannel): Promise<void> {
  const artifactsDir = path.join(workspaceRoot, GUARDIAN_ARTIFACTS_DIR);
  
  try {
    const decisionPath = findLatestFile(artifactsDir, 'decision.json');
    if (!decisionPath) {
      outputChannel.appendLine('[Guardian] No decision.json found');
      const msg = exitCode === 0 ? 'Reality check completed' : `Reality check completed (exit ${exitCode})`;
      vscode.window.showInformationMessage(`Guardian: ${msg}`);
      return;
    }

    const decisionText = fs.readFileSync(decisionPath, 'utf8');
    const decision = JSON.parse(decisionText);
    const verdict = canonicalVerdict(decision.finalVerdict || 'UNKNOWN');
    
    outputChannel.appendLine(`✅ Verdict: ${verdict}`);
    outputChannel.appendLine('═'.repeat(80));

    // Find summary.md for detailed report
    const summaryMdPath = findLatestFile(artifactsDir, 'summary.md');

    // Offer to open report
    let message = `Guardian: ${verdict}`;
    const action = await vscode.window.showInformationMessage(message, 'View report', 'Artifacts');
    
    if (action === 'View report' && summaryMdPath) {
      const doc = await vscode.workspace.openTextDocument(summaryMdPath);
      await vscode.window.showTextDocument(doc);
    } else if (action === 'Artifacts') {
      const uri = vscode.Uri.file(artifactsDir);
      await vscode.commands.executeCommand('revealFileInOS', uri);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[Guardian] Verdict error: ${msg}`);
    vscode.window.showInformationMessage('Guardian: Check completed.');
  }
}

function canonicalVerdict(v: string): string {
  const val = String(v || '').toUpperCase();
  if (val === 'READY' || val === 'FRICTION' || val === 'DO_NOT_LAUNCH') return val;
  if (val === 'SUCCESS' || val === 'PASS' || val === 'OBSERVED') return 'READY';
  if (val === 'WARN' || val === 'WARNING' || val === 'PARTIAL') return 'FRICTION';
  return 'DO_NOT_LAUNCH';
}

function findLatestFile(dir: string, fileName: string): string | null {
  const candidates: string[] = [];

  function scan(currentDir: string): void {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (entry.isFile() && entry.name === fileName) {
          candidates.push(fullPath);
        }
      }
    } catch (_) {}
  }

  scan(dir);
  if (candidates.length === 0) return null;
  
  // Return the most recently modified file
  candidates.sort((a, b) => {
    const statA = fs.statSync(a);
    const statB = fs.statSync(b);
    return statB.mtimeMs - statA.mtimeMs;
  });
  
  return candidates[0];
}

export function deactivate(): void {
  if (outputChannel) {
    outputChannel.appendLine('[Guardian] Extension deactivating');
    outputChannel.dispose();
  }
}