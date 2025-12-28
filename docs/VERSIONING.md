# Versioning Policy

Guardian follows [Semantic Versioning](https://semver.org/):

- **Major** (1.0.0): Breaking changes to the Guardian Contract or CLI
- **Minor** (0.x.0): New features, preset changes, non-breaking improvements
- **Patch** (0.2.x): Bug fixes and security updates

## Guardian Contract v1

Guardian's core contract is defined in [guardian-contract-v1.md](guardian-contract-v1.md).

The contract specifies:

- **Verdict enum**: `READY | FRICTION | DO_NOT_LAUNCH` (stable)
- **Exit codes**: 0 (READY), 1 (FRICTION), 2 (DO_NOT_LAUNCH) (stable)
- **decision.json schema**: Structure and required fields (see below)

### Stability Guarantees

**Verdict and Exit Codes**: Stable indefinitely. These will not change without a major version bump.

**decision.json Schema**:
- Required fields are guaranteed stable: `finalVerdict`, `exitCode`, `runId`, `timestamp`
- New optional fields may be added in minor releases without warning
- Removed fields require 2 minor version deprecation notice
- Schema changes are documented in [CHANGELOG.md](CHANGELOG.md)

**CLI Interface**:
- Core commands (`guardian reality`, `guardian smoke`) are stable
- New commands and flags may be added in minor releases
- Removed commands/flags require 2 minor version deprecation notice
- Breaking changes are marked in [CHANGELOG.md](CHANGELOG.md) with upgrade instructions

**Presets** (startup, saas, enterprise, landing-demo):
- Preset names are stable
- Preset behavior may evolve; use `--preset` + exact version if you need exact reproducibility
- Significant preset changes are noted in [CHANGELOG.md](CHANGELOG.md)

## Backward Compatibility

Guardian maintains backward compatibility within a major version:

- **Your code calling Guardian**: CLI interface is stable; update scripts only if [CHANGELOG.md](CHANGELOG.md) indicates a breaking change
- **decision.json consumers**: We will not remove required fields; new optional fields are additive only
- **CI/CD integrations**: GitHub Actions, GitLab CI, Bitbucket Pipelines integrations are stable

## Deprecation Policy

If we need to remove or break something:

1. **First minor release**: Announce deprecation in [CHANGELOG.md](CHANGELOG.md) with the removal version
2. **Next minor release**: Add a deprecation warning to CLI output
3. **Third minor release**: Remove the feature

**Example**:
- 0.2.0: Announce `--old-flag` deprecated, removed in 0.5.0
- 0.3.0: Deprecation warning when `--old-flag` is used
- 0.4.0: (no change)
- 0.5.0: `--old-flag` is removed; error if used

## Version Support

- **Current version (0.2.x)**: All bugs fixed; security updates provided
- **Previous minor (0.1.x)**: Security fixes only for 30 days after 0.2.0 release
- **Older versions**: Unsupported; upgrade recommended

## Checking Your Version

```bash
guardian --version
```

## Dependency Versions

Guardian pins major versions of critical dependencies:

- **Playwright**: Pinned to specific version (e.g., 1.48.2) in package.json
- **Node.js**: Requires 18.0.0 or higher (engines.node in package.json)

## Pre-Release Versions

Versions like `0.2.0-beta.1` or `0.2.0-rc1` are pre-releases and not recommended for production. The latest stable version (highest semver without pre-release identifier) should be used.

---

**Last Updated**: December 28, 2025
