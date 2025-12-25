import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

let outputChannel: vscode.OutputChannel;
let isRunning = false;

const LAST_URL_KEY = 'odavlGuardian.lastUrl';

function getWorkingDirectory(): string {
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    return vscode.workspace.workspaceFolders[0].uri.fsPath;
  }
  return os.homedir();
}

export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel('ODAVL Guardian');
  
  outputChannel.appendLine('[ODAVL Guardian] Extension activation started');
  outputChannel.appendLine(`[ODAVL Guardian] Version: ${context.extension.packageJSON.version}`);
  outputChannel.appendLine(`[ODAVL Guardian] Extension path: ${context.extensionPath}`);
  
  context.subscriptions.push(outputChannel);
  
  const runRealityCheckCommand = vscode.commands.registerCommand(
    'odavlGuardian.runRealityCheck',
    async () => {
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
      const workingDir = getWorkingDirectory();
      
      isRunning = true;
      
      await context.globalState.update(LAST_URL_KEY, trimmedUrl);
      
      outputChannel.show(true);
      outputChannel.appendLine('');
      outputChannel.appendLine('='.repeat(80));
      outputChannel.appendLine(`[Guardian] Starting reality check for: ${trimmedUrl}`);
      outputChannel.appendLine(`[Guardian] Working directory: ${workingDir}`);
      outputChannel.appendLine('='.repeat(80));
      outputChannel.appendLine('');

      vscode.window.showInformationMessage(`Guardian: Testing ${trimmedUrl}...`);

      let guardianProcess: ChildProcess | null = spawn('guardian', ['protect', trimmedUrl], {
        shell: true,
        cwd: workingDir
      });

      guardianProcess.stdout?.on('data', (data: Buffer) => {
        outputChannel.append(data.toString());
      });

      guardianProcess.stderr?.on('data', (data: Buffer) => {
        outputChannel.append(data.toString());
      });

      guardianProcess.on('error', (error: NodeJS.ErrnoException) => {
        outputChannel.appendLine('');
        outputChannel.appendLine(`[Guardian] Error: ${error.message}`);
        
        if (error.code === 'ENOENT') {
          vscode.window.showErrorMessage(
            'ODAVL Guardian CLI not found. Install it or add it to PATH.'
          );
        } else {
          vscode.window.showErrorMessage(
            `Failed to run Guardian: ${error.message}`
          );
        }
        
        isRunning = false;
        guardianProcess = null;
      });

      guardianProcess.on('close', async (code: number | null) => {
        outputChannel.appendLine('');
        outputChannel.appendLine('='.repeat(80));
        outputChannel.appendLine(`[Guardian] Process exited with code: ${code}`);
        outputChannel.appendLine('='.repeat(80));

        // Try to provide a clear notification including CRITICAL count
        try {
          const artifactsRoot = path.join(workingDir, 'artifacts');
          const latestReport = findLatestMarketReport(artifactsRoot);
          if (latestReport) {
            const text = fs.readFileSync(latestReport.path, 'utf8');
            const json = JSON.parse(text);
            const critical = json?.intelligence?.criticalCount ?? 0;
            const warning = json?.intelligence?.warningCount ?? 0;
            const info = json?.intelligence?.infoCount ?? 0;

            const msg = `Guardian completed${code === 0 ? '' : ' with issues'} — CRITICAL: ${critical} (⚠️ ${warning}, ℹ️ ${info})`;
            if (code === 0) {
              vscode.window.showInformationMessage(msg);
            } else {
              vscode.window.showErrorMessage(msg);
            }
          } else {
            // Fallback if report not found
            if (code === 0) {
              vscode.window.showInformationMessage('Guardian completed — report not found');
            } else if (code !== null) {
              vscode.window.showErrorMessage('Guardian completed with issues — report not found');
            }
          }
        } catch (notifyErr) {
          const emsg = notifyErr instanceof Error ? notifyErr.message : String(notifyErr);
          outputChannel.appendLine(`[Guardian] Notification error: ${emsg}`);
          if (code === 0) {
            vscode.window.showInformationMessage('Guardian completed');
          } else if (code !== null) {
            vscode.window.showErrorMessage('Guardian completed with issues');
          }
        }
        
        isRunning = false;
        guardianProcess = null;
      });
    }
  );

  context.subscriptions.push(runRealityCheckCommand);
  
  const openLastReportCommand = vscode.commands.registerCommand(
    'odavlGuardian.openLastReport',
    async () => {
      if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace open. Open a folder to locate reports.');
        return;
      }

      const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
      const artifactsPath = path.join(workspaceRoot, 'artifacts');

      outputChannel.appendLine('');
      outputChannel.appendLine('[Guardian] Searching for reports...');
      outputChannel.appendLine(`[Guardian] Artifacts path: ${artifactsPath}`);

      if (!fs.existsSync(artifactsPath)) {
        outputChannel.appendLine('[Guardian] No artifacts directory found');
        vscode.window.showErrorMessage('No Guardian report found yet. Run a check first.');
        return;
      }

      try {
        const reports = findReportFiles(artifactsPath);
        
        if (reports.length === 0) {
          outputChannel.appendLine('[Guardian] No report.html files found');
          vscode.window.showErrorMessage('No Guardian report found yet. Run a check first.');
          return;
        }

        reports.sort((a, b) => b.mtime - a.mtime);
        const latestReport = reports[0];

        outputChannel.appendLine(`[Guardian] Found ${reports.length} report(s)`);
        outputChannel.appendLine(`[Guardian] Latest report: ${latestReport.path}`);
        outputChannel.appendLine(`[Guardian] Modified: ${new Date(latestReport.mtime).toISOString()}`);

        const reportUri = vscode.Uri.file(latestReport.path);
        await vscode.env.openExternal(reportUri);
        
        outputChannel.appendLine('[Guardian] Report opened in browser');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        outputChannel.appendLine(`[Guardian] Error: ${errorMessage}`);
        vscode.window.showErrorMessage(`Failed to open report: ${errorMessage}`);
      }
    }
  );

  context.subscriptions.push(openLastReportCommand);
  
  outputChannel.appendLine('[ODAVL Guardian] Extension ready');
  outputChannel.appendLine('[ODAVL Guardian] Command registered: Guardian: Run Reality Check');
  outputChannel.appendLine('[ODAVL Guardian] Command registered: Guardian: Open Last Report');
}

function findReportFiles(dir: string): Array<{ path: string; mtime: number }> {
  const reports: Array<{ path: string; mtime: number }> = [];
  
  function searchDir(currentDir: string): void {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          searchDir(fullPath);
        } else if (entry.isFile() && entry.name === 'report.html') {
          const stats = fs.statSync(fullPath);
          reports.push({
            path: fullPath,
            mtime: stats.mtimeMs
          });
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  searchDir(dir);
  return reports;
}

export function deactivate(): void {
  if (outputChannel) {
    outputChannel.appendLine('[ODAVL Guardian] Extension deactivating');
    outputChannel.dispose();
  }
}
