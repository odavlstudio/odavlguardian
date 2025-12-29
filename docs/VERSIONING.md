# Versioning Policy

Guardian follows **Semantic Versioning** with explicit release state tracking.

---

## Current Release State: **BETA (0.3.0)**

Guardian v0.3.0 is a **working beta**:
- ✅ Engine runs successfully on real websites (50+ tested)
- ✅ Core verdicts are stable (READY | FRICTION | DO_NOT_LAUNCH)
- ✅ CLI is functional and documented
- ⏳ API stabilization in progress
- ⏳ Community feedback integration phase

**Before 1.0.0**, we will:
1. Validate on 100+ diverse real-world websites
2. Stabilize CLI command naming
3. Finalize preset behavior
4. Document edge cases and gotchas

---

## Version Strategy

Guardian follows [Semantic Versioning](https://semver.org/):

- **0.x.0 (Beta)**: Core features working, API subject to change, community testing phase
- **1.0.0 (Stable)**: API stability guaranteed, verdicts locked, ready for production
- **Major** (2.0.0+): Breaking changes only with clear migration path

---

## Guardian Contract v1

Guardian's core contract is defined in [guardian-contract-v1.md](guardian-contract-v1.md).

The contract specifies the three verdicts that will never change:

- **Verdict enum**: `READY | FRICTION | DO_NOT_LAUNCH` (stable even in beta)
- **Exit codes**: 0 (READY), 1 (FRICTION), 2 (DO_NOT_LAUNCH) (stable even in beta)
- **decision.json schema**: Core required fields (see below)

### Stability Guarantees (Even in Beta)

**Verdict and Exit Codes**: These are **locked indefinitely**. They will never change, even across major versions.

**decision.json Schema**:
- Required fields (`finalVerdict`, `exitCode`, `runId`, `timestamp`) are **guaranteed stable**
- New optional fields may be added in future beta or stable releases
- Removed fields (if any) require 2 minor version deprecation notice
- Schema changes are documented in [CHANGELOG.md](CHANGELOG.md)

**CLI Interface**:
- Core reality-check commands are stable: `guardian reality`, `guardian --url`
- Additional commands (`scan`, `journey-scan`, `attempt`, etc.) are experimental in beta
- Experimental commands may be renamed, removed, or stabilized in future releases
- Marked as experimental commands will have `[EXPERIMENTAL]` in help text
- Breaking changes to stable commands are documented with upgrade instructions

**Presets** (startup, saas, enterprise, landing-demo):
- Preset **names** are stable
- Preset **behavior** may evolve in beta releases based on community feedback
- Use `--preset <name> --version <version>` if you need exact reproducibility (if you need exact behavior)
- Significant preset changes are noted in [CHANGELOG.md](CHANGELOG.md)

## Backward Compatibility in Beta

During beta (0.x.0), we maintain **verdict stability** but **not full API stability**:

- **Guardian verdicts**: Stable; code consuming `decision.json` will work across beta releases
- **CLI core commands**: Stable; automation using `guardian reality --url` will not break
- **Experimental CLI commands**: May change or be removed without notice
- **Presets**: Behavior may improve based on real-world testing

---

## Path to 1.0.0

Before version 1.0.0, we will:

1. **Community validation** (100+ real-world sites)
2. **Edge case resolution** (handle deployment variations, CDNs, authentication edge cases)
3. **Preset stabilization** (finalize behavior, document thoroughly)
4. **CLI finalization** (lock command names, remove experimental commands)
5. **Documentation completion** (guides for common problems)

At 1.0.0:
- All commands documented in this file become stable
- All presets behavior locked
- Full backward compatibility guarantee begins
- Major.minor.patch semantics enforced strictly

## Deprecation Policy

If we need to remove or break something in beta:


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
