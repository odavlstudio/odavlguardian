# Guardian Behavior Contracts

## Overview

This directory contains **permanent behavior contracts** that lock the core philosophy and safety guarantees of ODAVL Guardian. Any future regression **must break tests and CI immediately**.

All contracts are executable (not mock-based) and verify real CLI paths and module APIs.

---

## Contract A: CI Gate Default Is Strict

**What it protects:** The CI gate cannot be tricked into advisory mode by default.

**Tests:**
- ✅ CI gate without `--mode` flag defaults to strict mode (fails on DO_NOT_LAUNCH)
- ✅ CI gate fails with exit code 2 when verdict is DO_NOT_LAUNCH
- ✅ Advisory mode requires explicit `--mode advisory` flag

**File:** `contract-ci-gate.test.js`

**Why it matters:** CI/CD pipelines depend on strict-by-default behavior to block deployments. Defaulting to advisory would be a silent security regression.

---

## Contract B: Exit Code Truth Table (Canonical)

**What it protects:** The exit code semantics that CI systems rely on for pipeline branching.

**Canonical mapping (must never change):**
- `READY` → exit code **0** (proceed)
- `FRICTION` → exit code **1** (investigate)
- `DO_NOT_LAUNCH` → exit code **2** (blocked)
- `ERROR` / `UNKNOWN` → exit code **3** (system error)

**Tests:**
- ✅ Exit code mapping function is consistent
- ✅ CLI execution respects exit code mapping
- ✅ Error/unreachable URLs exit with code 3
- ✅ Invalid command syntax exits non-zero
- ✅ Help and version commands exit 0

**File:** `contract-exit-codes.test.js`

**Why it matters:** External CI/CD systems (GitHub Actions, GitLab, Jenkins, etc.) rely on exact exit codes for conditional logic. Any change breaks downstream automation.

---

## Contract C: Filesystem Containment

**What it protects:** Guardian cannot be exploited to write outside its safe base directory.

**Safety guarantees:**
- Traversal paths (`../../../`) are rejected with error exit code
- Absolute external paths (`/etc/passwd`, `C:\Windows\`) are rejected
- No files created outside base directory on failure
- Containment errors throw with code `EOUTOFBASE`

**Tests:**
- ✅ Traversal path (`..`) fails with exit code 2/3
- ✅ Absolute external path fails with exit code 2/3
- ✅ Path safety module enforces containment at API level
- ✅ Containment errors have code `EOUTOFBASE`

**File:** `contract-filesystem.test.js`

**Why it matters:** Prevents privilege escalation, data exfiltration, and container breakouts. A single vulnerability here could compromise production systems.

---

## Contract D: Always-Log Evidence

**What it protects:** Audit trail and observability for every CLI invocation.

**Observability guarantees:**
- Every CLI run emits "Evidence log:" to console
- Log file always exists under `.odavlguardian/logs/`
- Log entries are structured JSON (parseable)
- Failed runs include error information in logs

**Tests:**
- ✅ CLI outputs "Evidence log:" on every invocation
- ✅ Log directory created on first run
- ✅ Log files contain valid JSON entries
- ✅ Failed runs logged with error context
- ✅ Even help command creates evidence log
- ✅ Logger creates directory with secure permissions

**File:** `contract-observability.test.js`

**Why it matters:** Without guaranteed logging, compliance violations, security incidents, and debugging become impossible. This is non-negotiable for production tools.

---

## Contract E: Scheduler Safety Guarantees

**What it protects:** Guardian's background scheduler cannot cause DoS, tight loops, or data corruption.

**Safety guarantees:**
- Invalid scheduler state is quarantined (not executed)
- Invalid `nextRunAt` applies minimum 1s backoff (prevents tight loops)
- Backoff increases exponentially on consecutive failures
- Child process spawn errors trigger failure response + logging
- No timers created for invalid entries

**Tests:**
- ✅ Invalid URL scheme quarantined on load
- ✅ Invalid date triggers >= 1s minimum backoff
- ✅ Stale timestamps trigger exponential backoff
- ✅ Backoff capped at reasonable maximum (1 hour)
- ✅ Child spawn errors logged and trigger rescheduling
- ✅ Valid schedules not quarantined
- ✅ Validation enforces minimum interval

**File:** `contract-scheduler.test.js`

**Why it matters:** Background scheduler could silently consume resources or corrupt state. Quarantine + backoff + logging ensures failures are visible and bounded.

---

## Running Contracts

### All contracts:
```bash
npm run test:contracts
```

### Individual contract:
```bash
mocha test/contracts/contract-ci-gate.test.js --timeout 60000
mocha test/contracts/contract-exit-codes.test.js --timeout 60000
mocha test/contracts/contract-filesystem.test.js --timeout 60000
mocha test/contracts/contract-observability.test.js --timeout 60000
mocha test/contracts/contract-scheduler.test.js --timeout 60000
```

### Integrated with full suite:
```bash
npm test
```

---

## Test Philosophy

All contract tests follow strict principles:

1. **Real CLI execution** - Tests spawn actual guardian CLI process, not mocks
2. **Offline & deterministic** - No external services, no flaky timeouts
3. **Fail-safe verification** - Tests verify FAILURES work, not just happy path
4. **Isolated workspaces** - Each test gets temp directory, no state pollution
5. **Exit code obsession** - Every test verifies exact exit codes
6. **Filesystem isolation** - No files outside temp directory
7. **Logging everywhere** - Tests verify logs even for fastest operations

---

## Contract Breakage Response

If a contract test fails:

1. **This is a regression** - Not a test issue
2. **CI will block** - PR cannot merge
3. **Communicate impact** - Document what breaks downstream
4. **Update tests last** - Only after discussing with maintainers

Example: Changing exit code 2 → exit code 1 for DO_NOT_LAUNCH would break every CI system using Guardian. Contract prevents silent breaking change.

---

## Future Contracts

Candidates for future contracts:
- Policy enforcement rules (what a READY verdict actually guarantees)
- Baseline comparison determinism (same run = same baseline)
- Attempt execution ordering (no side effects between attempts)
- Evidence capture completeness (screenshot + trace + network logs)

---

Generated: 2026-01-02
Guardian Version: 2.0.0+contracts
