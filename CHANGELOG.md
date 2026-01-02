# Changelog

All notable changes to **ODAVL Guardian** are documented in this file.

This project follows **semantic versioning**, with a strong emphasis on:

- reality-based behavior
- honest outcomes
- evidence over assumptions

---

## [2.0.0] — Canonical Stable Release

**Release date:** 2026-01-02  
**Status:** Stable (breaking changes)

### Breaking Changes

**Strict-by-default CI gate (BREAKING)**
- Default CI behavior is strict gate mode; advisory requires explicit opt-in.
- Users relying on advisory mode by default must now explicitly set `--mode=advisory`.
- Canonical exit codes are locked via contract tests to prevent regressions.

**Runtime filesystem isolation (BREAKING)**
- Path traversal and external artifact writes are now blocked and contract-enforced.
- Previously allowed writes to paths outside the project directory will now fail.
- Enhances security and prevents unintended side effects in build pipelines.

### Features & Improvements

**Supply chain hardening**
- npm ci / npm audit report 0 vulnerabilities (high/critical) in dependencies.
- All security advisories resolved.

**Scheduler stabilized**
- Scheduler quarantine/backoff prevents tight loops and executes only valid entries.
- Deterministic run execution in high-concurrency environments.

**Contract test coverage**
- Exit codes (0=READY, 1=FRICTION, 2=DO_NOT_LAUNCH) locked via contract tests.
- No behavior regressions allowed going forward.

---

## [1.1.1] — Reality Freeze & Version Alignment Release

**Release date:** 2025-12-31  
**Status:** Stable (production-ready)  
**Archive Status:** Pre-canonical / experimental development history

### Features

**Version Alignment**
- npm package @odavl/guardian: 1.1.1
- VS Code extension (odavl-guardian): 1.1.1
- Documentation aligned with single stable version

**Watchdog Mode Promotion (Stage 7)**
- Post-launch monitoring promoted to stable
- Create baselines: `guardian --baseline=create`
- Monitor production: `guardian --watchdog`
- Detect and alert on degradation automatically
- Integrated into main test suite

**Behavior**
- All 1.0.x behavior preserved and stable
- No feature additions or removals
- Reality freeze: all observable behavior locked for stability


## v1.0.0 — First Stable Release

**Release date:** 2025-12-30  
**Status:** Stable (production-ready)  
**Archive Status:** Pre-canonical / experimental development history

- Guardian is now the final decision authority before launch.
- Introduced Observable Capabilities (VISIBLE = MUST WORK).
- Absent features are not penalized (NOT_OBSERVED ≠ FAILURE).
- Honest verdict enforcement with fair coverage calculation.
- Deterministic verdicts: READY / FRICTION / DO_NOT_LAUNCH.
- CLI, npm package, and VS Code extension aligned.
- Read-only transparency via decision.json and artifacts.
- No behavior overrides. No force-ready flags.

## [1.0.1] — Patch Release

**Release date:** 2025-12-31  
**Status:** Stable (production-ready)  
**Archive Status:** Pre-canonical / experimental development history

### What's New

**Watchdog Mode (Post-Launch Monitoring)**
- Guardian now monitors production after launch
- Create baselines from known-good state (`--baseline=create`)
- Detect degradation automatically (`--watchdog`)
- Alert on verdict downgrades, coverage drops, failing flows
- Update baselines after fixes (`--baseline=update`)
- Stored in `.guardian/watchdog-baselines/`

**Site Intelligence Engine** (carried from early 1.0.1)
- Automatic site understanding and capability detection
- Non-applicable flows skipped intelligently
- More accurate and human-aligned verdicts

**Verdict Cards** (Stage 6)
- Human-readable verdict summaries in decision.json
- Business impact assessment
- Evidence and confidence signals

**No breaking changes** — All v1.0.0 behavior preserved

## [v0.3.0] — Beta Release with Working Engine

**Release date:** 2025-12-28  
**Status:** Beta (engine proven, real-world validation in progress)  
**Archive Status:** Pre-canonical / experimental development history

### 🎯 Purpose

This beta release establishes the **working core** of ODAVL Guardian as a
**reality-based website guard** with proven engine execution.

The engine successfully runs on real websites (50+ documented runs in artifacts).
This release is for community testing and feedback before 1.0.0 stability.

Guardian evaluates whether a **real human user can successfully complete a goal** —
not whether the code technically passes.

---

### ✨ Added

- Reality-driven scanning engine executing real user-like flows
- Human-centered result evaluation (goal reached vs. user failed)
- Deterministic outcome classification:
  - `READY`
  - `FRICTION`
  - `DO_NOT_LAUNCH`
- Machine-readable decision artifacts (`decision.json`)
- Clear failure reasons when user goals are not achieved
- CLI-based execution with explicit run summaries
- VS Code extension for quick access
- GitHub Action for CI/CD integration
- Comprehensive documentation and examples

---

### 🧠 Design Principles Introduced

- Reality > Implementation
- No hallucinated success
- No optimistic assumptions
- Evidence-based decisions
- Human experience as the primary signal

---

### 📊 Artifacts & Evidence

- Deterministic run outputs
- Explicit decision semantics
- Reproducible scan behavior per scenario

---

### ⚠️ Beta Limitations & Community Testing

This is a **working beta**, not a stable 1.0.0 release. The engine runs successfully on real websites, but:

- Community feedback needed before API stability guarantee
- Edge cases and deployment variations still being discovered
- Performance benchmarking in progress
- Preset scenarios limited (4 presets for MVP scope)
- Website deployment being finalized
- Some CLI commands experimental

**What we guarantee in beta:**
- Core verdict engine produces consistent, deterministic results
- No hallucinated success — failures are reported honestly
- Evidence artifacts are reproducible
- Exit codes are stable (0=READY, 1=FRICTION, 2=DO_NOT_LAUNCH)

**What will change before 1.0.0:**
- CLI command naming (some experimental commands will be removed or renamed)
- Preset behavior refinement based on real usage
- Policy system enhancement
- Additional documentation and examples

---

### 🔮 What This Release Does *Not* Promise

- No guarantee of full test coverage  
- No replacement for unit, integration, or security tests
- No automated CI enforcement by default (available but optional)
- Not a substitute for dedicated penetration testing

---

### 🔗 References

- [GitHub Release](https://github.com/odavlstudio/odavlguardian/releases/tag/v1.0.0)

---

*ODAVL Guardian v1.0.0 establishes the truth engine.  
If a real user can fail — Guardian will find it.*
