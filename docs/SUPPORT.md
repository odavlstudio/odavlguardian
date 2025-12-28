# Support Policy

Guardian is a best-effort, community-supported tool. ODAVL provides support through public channels and GitHub issues.

## Support Channels

- **GitHub Issues**: Report bugs, request features, or ask usage questions
- **GitHub Discussions**: General questions and ideas
- **Documentation**: [README.md](README.md), [VERSIONING.md](VERSIONING.md), [Guardian Contract v1](guardian-contract-v1.md)

## What We Support

### Critical Issues (High Priority)

**Definition**: Guardian produces an incorrect verdict or crashes.

**Examples**:
- Guardian returns `READY` when the target site is actually broken
- Guardian crashes with a stack trace
- Guardian hangs indefinitely (not respecting timeouts)
- Decision.json is missing or malformed

**Response Target**: Acknowledge within 5 business days; fix target within 14 days.

### High Priority Issues

**Definition**: Guardian works but produces misleading output, or the CI/CD integration is broken.

**Examples**:
- Guardian takes 30 minutes to complete (should be < 10 min)
- GitHub Actions integration fails silently
- False friction/friction signal inconsistency across runs

**Response Target**: Acknowledge within 5 business days; fix target within 30 days.

### Medium Priority Issues

**Definition**: Feature requests or workflow improvements.

**Examples**:
- Add support for a new preset
- Add a new environment variable
- Improve error messages

**Response Target**: Acknowledge within 10 business days; no fix guarantee.

### Low Priority Issues

**Definition**: Documentation improvements, minor UX polish.

**Examples**:
- Typos in README
- Clearer examples

**Response Target**: Address when time permits.

## What We Don't Support

- **Installation help**: If you can't run `npm install -g @odavl/guardian`, verify Node.js 18+ is installed
- **CI/CD environment setup**: We support Guardian itself; not your CI/CD platform's configuration
- **Target website issues**: Guardian tests your site; it doesn't fix it
- **Browser/Playwright issues**: Report to Playwright if Guardian is using an old version
- **Custom policies/flows**: We ship presets; custom implementations are out of scope
- **Performance optimization for slow networks**: Guardian's timeouts are reasonable defaults

## Upgrade Expectations

- **You should upgrade Guardian within 30 days of a new release** if your version is no longer supported
- **Security fixes are not backported** to older versions; upgrade to get fixes
- **Breaking changes** are announced in [VERSIONING.md](VERSIONING.md) with a deprecation period of at least 2 minor releases

## Version Support Matrix

| Version | Status | Support Until | Notes |
|---------|--------|---|---|
| 0.2.x | Current | When 0.3.0 is released + 30 days | Bug fixes and security updates |
| 0.1.x | EOL | 2025-12-23 | No further updates |

## Issue Response Examples

### ✅ Critical (We'll Investigate)
```
"Guardian says my site is READY, but it's completely broken"
→ We'll reproduce and fix
```

### ✅ High (We'll Look At)
```
"Guardian takes 15 minutes to complete"
→ We'll investigate performance
```

### ✅ Medium (We'll Consider)
```
"Please add a custom timeout for slow sites"
→ We'll consider for next release
```

### ❌ Out of Scope
```
"My site broke; can Guardian fix it?"
→ Guardian tests; it doesn't fix
```

## Contributing a Fix

If you find a bug and want to fix it yourself:

1. Open an issue describing the problem
2. Fork the repository
3. Make your change with tests
4. Open a pull request

See [MAINTAINERS.md](MAINTAINERS.md) for contribution guidelines.

---

**Last Updated**: December 28, 2025
