# Security Policy

## Supported Versions

Guardian maintains security fixes for the current version and the immediately preceding minor release.

| Version | Status | End of Support |
|---------|--------|-----------------|
| 0.2.x   | Supported | When 0.3.0 is released + 30 days |
| 0.1.x   | Unsupported | 2025-12-23 |
| 0.0.x   | Unsupported | 2025-06-01 |

**Upgrade Expectation**: Users should upgrade to the latest version within 30 days of release. Security fixes are not backported to older minor versions.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report security issues privately to: **security@odavlstudio.com**

### What to Include

When reporting a vulnerability, please provide:

- **Title**: Brief description of the issue
- **Component**: Which part of Guardian is affected (CLI, browser automation, decision logic, CI/CD action, etc.)
- **Severity**: Your assessment (critical/high/medium/low)
- **Steps to Reproduce**: Clear, step-by-step instructions
- **Impact**: What could happen if exploited (data disclosure, false verdict, execution, etc.)
- **Environment**: Guardian version, Node.js version, OS, CI/CD platform (if applicable)
- **Optional**: A proof-of-concept or test case

## Response Timeline

- **Acknowledgment**: Within 72 hours
- **Assessment**: Within 5 business days
- **Fix Timeframe**: Depends on severity
  - Critical: 7 days
  - High: 14 days
  - Medium: 30 days
  - Low: Next release

## Disclosure Process

We practice coordinated disclosure:

1. Reporter submits vulnerability privately
2. ODAVL assesses and confirms the issue
3. ODAVL prepares a fix in a private branch
4. ODAVL proposes a disclosure timeline (typically 7–14 days before public announcement)
5. Fix is released
6. Vulnerability is disclosed publicly with credit to reporter

**Do not**:
- Disclose the vulnerability publicly before we have released a fix
- Attempt to exploit the vulnerability beyond proof-of-concept
- Share the vulnerability details with third parties

## What We Will/Won't Fix

### We Will Fix
- Incorrect verdicts caused by logic bugs
- Execution failures or crashes
- Security issues in browser automation
- Dependency vulnerabilities

### We Will Not Fix (Out of Scope)
- Issues in the target website (Guardian tests sites; it doesn't fix them)
- User-specific environment setup problems
- Performance issues in slow networks (Guardian has reasonable timeouts)
- False positives that depend on subjective interpretation of "reality"

## Credits

We acknowledge and thank security researchers who report vulnerabilities responsibly. With permission, reporters will be credited in the release notes and SECURITY.md.

## Additional Resources

- [Guardian Contract v1](guardian-contract-v1.md) — Guardian's testing guarantees and schema
- [Versioning Policy](VERSIONING.md) — How breaking changes are handled
- [Support Policy](SUPPORT.md) — What support is available

---

**Last Updated**: December 28, 2025
