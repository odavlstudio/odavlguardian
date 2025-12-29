# ODAVL Guardian — VS Code Extension

Browser testing and market reality validation for your web applications.

**Status:** Beta (v0.3.0) — Synchronized with core Guardian CLI

## Features

- **Run Reality Check**: Execute Guardian CLI tests directly from VS Code
- **View Last Report**: Instantly open the most recent test report in your browser

## Commands

- **Guardian: Run Reality Check** - Run a test against any URL
- **Guardian: Open Last Report** - Open the latest generated report

## Requirements

- **Node.js 18+** must be installed
- **ODAVL Guardian CLI** must be installed: `npm install -g @odavl/guardian`

Verify installation:
```bash
guardian --version
```

Should show: `0.3.0` (or later)

## Usage

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "Guardian" to see available commands
3. Select your desired command
4. Enter the URL to test (e.g., `https://example.com`)
5. Results open automatically in your default browser

## Version Matching

This extension version matches the core Guardian CLI version. Both use v0.3.0 (beta).

If versions don't match, reinstall:
```bash
npm install -g @odavl/guardian@latest
```

## Support

- **Documentation**: [github.com/odavlstudio/odavlguardian/docs](https://github.com/odavlstudio/odavlguardian/tree/main/docs)
- **Issues**: [github.com/odavlstudio/odavlguardian/issues](https://github.com/odavlstudio/odavlguardian/issues)
- **Getting Started**: Run `guardian --help` in terminal or read [docs/guardian/getting-started.md](https://github.com/odavlstudio/odavlguardian/blob/main/docs/guardian/getting-started.md)
