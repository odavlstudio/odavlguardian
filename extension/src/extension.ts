import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
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
  
  outputChannel.appendLine('Guardian Extension: Honest companion to the Guardian CLI');
  outputChannel.appendLine(`Version: ${context.extension.packageJSON.version}`);
  outputChannel.appendLine('');
  
  context.subscriptions.push(outputChannel);
  
  const runRealityCheckCommand = vscode.commands.registerCommand(
    'odavlGuardian.runRealityCheck',
    async () => {
      // Workspace awareness: require workspace
      const workspaceRoot = getWorkspaceRoot();
      if (!workspaceRoot) {
        vscode.window.showErrorMessage('Guardian: No workspace folder open. Open a folder to run Guardian.');
        return;
      }

      if (isRunning) {
        vscode.window.showWarningMessage('Guardian is already running.');
        return;
      }

      const lastUrl = context.globalState.get<string>(LAST_URL_KEY);
      
      const url = await vscode.window.showInputBox({
        prompt: 'Enter the URL to test',
        placeHolder: 'https://example.com',
        value: lastUrl,
        validateInput: (value: string) => {
          const trimmed = value.trim();
          if (!trimmed) {
            return 'URL cannot be empty';
          }
          return null;
        }
      });

      if (!url) {
        return;
      }

      const trimmedUrl = url.trim();
      isRunning = true;
      await context.globalState.update(LAST_URL_KEY, trimmedUrl);
      
      outputChannel.show(true);
      outputChannel.appendLine('');
      outputChannel.appendLine('='.repeat(80));
      outputChannel.appendLine(`Guardian Reality Check: This extension launches the Guardian CLI and displays results.`);
      outputChannel.appendLine(`Target: ${trimmedUrl}`);
      outputChannel.appendLine(`Workspace: ${workspaceRoot}`);
      outputChannel.appendLine(`Artifacts: ${path.join(workspaceRoot, GUARDIAN_ARTIFACTS_DIR)}`);
      outputChannel.appendLine('Config: source=extension (guardian.config.json is not applied by the extension)');
      outputChannel.appendLine('Note: To change artifacts dir for the extension, adjust VS Code settings or override via CLI args in a custom task.');
      outputChannel.appendLine('='.repeat(80));
      outputChannel.appendLine('');

      // Show progress notification
      const progressPromise = vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: `Guardian: Testing ${trimmedUrl}...` },
        async () => {
          return new Promise<void>((resolve) => {
            // Robust CLI resolution with fallback chain
            const resolved = resolveGuardianCommand(workspaceRoot, trimmedUrl);
            if ('error' in resolved && resolved.error) {
              outputChannel.appendLine(`[Guardian] Error: ${resolved.error}`);
              outputChannel.appendLine('');
              outputChannel.appendLine('Remediation steps:');
              resolved.remediation?.forEach((step: string) => outputChannel.appendLine(`  1. ${step}`));
              outputChannel.appendLine('');
              vscode.window.showErrorMessage(`Guardian: ${resolved.error}`, { modal: true, detail: resolved.remediation?.join('\n') });
              isRunning = false;
              resolve();
              return;
            }

            const guardianResolved = resolved as { command: string; args: string[]; cwd: string; source: string };
            outputChannel.appendLine(`CLI Resolution: ${guardianResolved.source}`);
            outputChannel.appendLine(`Command: ${guardianResolved.command} ${guardianResolved.args.join(' ')}`);
            outputChannel.appendLine(`Working Directory: ${guardianResolved.cwd}`);
            outputChannel.appendLine(`Effective artifacts dir: ${path.join(workspaceRoot, GUARDIAN_ARTIFACTS_DIR)} (extension override)`);
            outputChannel.appendLine('');
            outputChannel.appendLine('Output:');
            outputChannel.appendLine('');

            const guardianProcess: ChildProcess | null = spawn(guardianResolved.command, guardianResolved.args, {
              shell: true,
              cwd: guardianResolved.cwd,
              stdio: ['pipe', 'pipe', 'pipe']
            });

            if (!guardianProcess) {
              vscode.window.showErrorMessage('Guardian: Failed to start process');
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
              outputChannel.appendLine('');
              outputChannel.appendLine(`[Guardian] Process error: ${error.message}`);
              
              if (error.code === 'ENOENT') {
                const remediation = ['Install Guardian', 'Verify binary path', 'Ensure workspace has node_modules or bin/guardian.js'];
                outputChannel.appendLine('Remediation:');
                remediation.forEach((step: string) => outputChannel.appendLine(`  - ${step}`));
                vscode.window.showErrorMessage(
                  'Guardian CLI not found',
                  { modal: true, detail: remediation.join('\n') }
                );
              } else {
                vscode.window.showErrorMessage(`Guardian: ${error.message}`, { modal: true });
              }
              
              isRunning = false;
              resolve();
            });

            guardianProcess.on('close', async (code: number | null) => {
              outputChannel.appendLine('');
              outputChannel.appendLine('='.repeat(80));
              outputChannel.appendLine(`Guardian Process Exit: code=${code}`);
              outputChannel.appendLine('='.repeat(80));

              // Extract and display verdict
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
  
  const openLastReportCommand = vscode.commands.registerCommand(
    'odavlGuardian.openLastReport',
    async () => {
      const workspaceRoot = getWorkspaceRoot();
      if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace folder open. Open a folder to locate reports.');
        return;
      }

      const artifactsPath = path.join(workspaceRoot, GUARDIAN_ARTIFACTS_DIR);

      outputChannel.appendLine('');
      outputChannel.appendLine('[Guardian] Searching for reports...');
      outputChannel.appendLine(`[Guardian] Artifacts path: ${artifactsPath}`);

      if (!fs.existsSync(artifactsPath)) {
        outputChannel.appendLine('[Guardian] No artifacts directory found');
        vscode.window.showErrorMessage('No Guardian report found yet. Run a check first.');
        return;
      }

      try {
        const latest = findLatestReport(artifactsPath);
        if (!latest) {
          outputChannel.appendLine('[Guardian] No reports found');
          vscode.window.showErrorMessage('No Guardian report found yet. Run a check first.');
          return;
        }

        outputChannel.appendLine(`[Guardian] Latest report: ${latest.path}`);

        const doc = await vscode.workspace.openTextDocument(latest.path);
        await vscode.window.showTextDocument(doc);
        outputChannel.appendLine('[Guardian] Report opened in editor');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        outputChannel.appendLine(`[Guardian] Error: ${errorMessage}`);
        vscode.window.showErrorMessage(`Failed to open report: ${errorMessage}`);
      }
    }
  );

  context.subscriptions.push(openLastReportCommand);
  
  outputChannel.appendLine('Guardian Extension: Ready');
  outputChannel.appendLine('Command: Guardian: Run Reality Check');
  outputChannel.appendLine('Command: Guardian: Open Last Report');
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
      if (exitCode === 0) {
        vscode.window.showInformationMessage('Guardian: Check completed.');
      } else {
        vscode.window.showErrorMessage(`Guardian: Check completed with exit code ${exitCode}`);
      }
      return;
    }

    const decisionText = fs.readFileSync(decisionPath, 'utf8');
    const decision = JSON.parse(decisionText);
    const verdict = canonicalVerdict(decision.finalVerdict || 'unknown');
    const reason = decision.explanation?.explanation || decision.sections?.['Final Verdict']?.explanation || 'No explanation available';

    outputChannel.appendLine(`[Guardian] Verdict: ${verdict}`);
    outputChannel.appendLine(`[Guardian] Reason: ${reason}`);

    // Find summary.md for "Open summary" button
    const summaryMdPath = findLatestFile(artifactsDir, 'summary.md');
    const artifactsFolderUri = vscode.Uri.file(artifactsDir);

    // Build notification with action buttons
    let message = `Guardian: ${verdict} (exit ${exitCode})`;
    if (reason) {
      message += ` — ${reason.substring(0, 100)}${reason.length > 100 ? '...' : ''}`;
    }

    const buttons: string[] = [];
    if (summaryMdPath) buttons.push('Open summary.md');
    buttons.push('Open artifacts folder');

    const choice = await vscode.window.showInformationMessage(message, ...buttons);
    
    if (choice === 'Open summary.md' && summaryMdPath) {
      const doc = await vscode.workspace.openTextDocument(summaryMdPath);
      await vscode.window.showTextDocument(doc);
    } else if (choice === 'Open artifacts folder') {
      await vscode.commands.executeCommand('revealFileInOS', artifactsFolderUri);
    }
  } catch (error) {
    const emsg = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[Guardian] Verdict error: ${emsg}`);
    if (exitCode === 0) {
      vscode.window.showInformationMessage('Guardian: Check completed.');
    } else {
      vscode.window.showErrorMessage(`Guardian: Check completed with exit code ${exitCode}`);
    }
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