# ODAVL Guardian — Contract v1.0

Status: Active

Scope: Guardian MVP

Version: v1.0

Decision-Grade: Yes

## 0) Purpose

This contract defines the canonical, non-negotiable rules and guarantees for ODAVL Guardian’s Market Reality Testing Engine at MVP scope. It specifies final decisions, confidence semantics, evidence requirements, flow execution rules, honesty constraints, prohibited behaviors, verifiability, and stability expectations. All implementations, outputs, and operator-facing UX must conform to this contract.

## 1) Definition

ODAVL Guardian is a headless browser-based reality testing engine that:

- Launches a real browser (Playwright/Chromium) to inspect a site via crawl and/or execute predefined flows.
- Collects evidence artifacts (screenshots, logs, reports, traces, optional HAR) for verifiable outcomes.
- Computes coverage and behavior metrics, forms a conservative confidence judgment, and issues a final decision.
- Emits machine-readable `report.json`, human-readable `report.html`, `logs.txt`, and run directory with artifacts.

Terminology:

- "Coverage Confidence": Confidence derived from how much of the site was observed (depth/pages vs discovered).
- "Behavioral Confidence": Confidence derived from observed runtime stability and health (navigation/http/page/console errors).
- "Evidence Policy": The resolved set of required vs optional artifacts that must be present for a decision to be valid.
- "Flow": A predefined deterministic sequence of real user interactions (navigate/click/type/submit/waitFor).

## 2) Final Decisions

Guardian issues exactly three decisions:

- READY — Site is acceptable for MVP launch given the evidence and confidence model.
- DO_NOT_LAUNCH — Launch is blocked due to critical failure or missing required evidence.
- INSUFFICIENT_CONFIDENCE — Evidence and/or behavior do not justify readiness.

Exit codes:

- READY → 0
- DO_NOT_LAUNCH → 1
- INSUFFICIENT_CONFIDENCE → 1
- TOOL ERROR → 2

Decision drivers:

- Any Flow FAIL → DO_NOT_LAUNCH.
- Required evidence missing per Evidence Policy → DO_NOT_LAUNCH.
- Overall confidence HIGH or MEDIUM → READY.
- Overall confidence LOW → INSUFFICIENT_CONFIDENCE.

## 3) Confidence Model

Guardian separates confidence into two dimensions and a resolved overall level.

### 3.1 Coverage Confidence

- HIGH: Sufficient coverage (e.g., deep exploration and/or high coverage percentage).
- MEDIUM: Moderate coverage.
- LOW: Limited coverage (e.g., very few pages visited).

### 3.2 Behavioral Confidence

- HIGH: No critical runtime instability (no navigation failures, no page errors, no server 5xx), acceptable client logs.
- MEDIUM: Minor issues (e.g., 4xx or console errors) without critical failures.
- LOW: Critical instability (navigation failure, unhandled page errors, or server 5xx).

### 3.3 Overall Confidence Resolution

- HIGH: Sufficient coverage OR a successful Flow with no critical errors.
- MEDIUM: Limited coverage BUT clean behavior (no page errors or critical failures); minor issues allowed.
- LOW: Insufficient coverage AND/OR unstable behavior (critical failures present).

Guardian must record a human-readable "reasoning" for the resolved confidence.

## 4) Evidence Contract

Guardian enforces an explicit Evidence Policy defining required vs optional artifacts.

### 4.1 Policy Modes

- normal (default):
  - REQUIRED: screenshots (pages and flow steps), `report.json`, `report.html`.
  - REQUIRED when enabled: `trace.zip`.
  - OPTIONAL: `network.har`/`network.json`.
- strict:
  - REQUIRED: screenshots, `report.json`, `report.html`.
  - REQUIRED when enabled: `trace.zip` and `network.har`/`network.json`.
- custom (via CLI overrides):
  - `--require-har` forces HAR required.
  - `--optional-har` forces HAR optional.
  - Precedence: `require-har` > `optional-har` > `--evidence`.

### 4.2 Missing Evidence Handling

- Missing REQUIRED evidence → DO_NOT_LAUNCH.
- Missing OPTIONAL evidence → does not block READY; recorded as warnings and may reduce confidence.

### 4.3 Evidence Reporting (report.json)

Guardian must include:

evidence: {
  policy: { mode: "normal|strict|custom", requirements: { screenshots: true, traceWhenEnabled: true, harWhenEnabled: true|false } },
  present: { screenshots: true|false, trace: true|false|null, har: true|false|null },
  requiredMissing: [ ... ],
  optionalMissing: [ ... ],
  warnings: [ { code, message } ]
}

The HTML report must present the Evidence Policy, list required/optional missing items, and warnings.

## 5) Flow Contract

Flows are executed as real interactions through the browser and must:

- Support step types: `navigate <url>`, `click <selector(s)>`, `type <selector> <value>`, `submit <selector>`, `waitFor <selector|url:pattern>`.
- Capture a full-page screenshot for each step with deterministic naming (`flow-XX-type.png`).
- Stop immediately on step failure; record `failedStepIndex`, the error, and mark Flow result FAIL.
- Treat any Flow FAIL as REVENUE-BLOCKING: the final decision must be DO_NOT_LAUNCH.
- Log step-by-step outcomes in `report.json` and `report.html`.

## 6) Honesty & Transparency

Guardian must:

- Never overstate certainty; only issue READY when justified by the confidence model and evidence policy.
- Explicitly list reasons for final decisions and confidence (human-readable) in outputs.
- Disclose coverage limitations (e.g., LOW coverage warning) visibly in CLI and HTML.
- Preserve conservative defaults that favor truthful reporting.

## 7) Prohibited Behaviors

Guardian must not:

- Ignore missing REQUIRED evidence.
- Fabricate or simulate evidence artifacts.
- Issue READY when overall confidence is LOW.
- Suppress critical errors (navigation failures, page errors, server 5xx) from decisions.
- Alter artifacts or reports after generation except for permitted `--clean` on PASS.

## 8) Verifiability

Guardian must be verifiable via:

- Reproducible commands and exit codes (PowerShell examples in README).
- Stable artifact paths under `artifacts/run-YYYYMMDD-HHMMSS/` including `report.json`, `report.html`, `logs.txt`, screenshots, traces, and HAR/network when present.
- Machine-readable fields capturing coverage, behavior, evidence, flow results, blockers, and final decisions.

CLI must surface final decision, confidence summary (coverage + behavior + reasoning), evidence policy, and warnings.

## 9) Stability Clause

Guardian aims for stable, repeatable outcomes under identical inputs:

- Flow runs must be deterministic with consistent PASS/FAIL given the same site state.
- Crawl outcomes may vary in timing, but decisions should remain consistent when behavior and evidence are unchanged.
- Evidence presence (trace/HAR) may vary by environment; the Evidence Policy governs whether such variance affects decisions.
- Any non-deterministic behavior should be logged; the final decision must remain conservative.

## Final Seal / Closing Statement

This contract is canonical for ODAVL Guardian MVP. All implementations and outputs must adhere strictly to these rules. Operators rely on Guardian’s conservative, evidence-driven judgments; deviations from this contract are prohibited. Changes to this contract require explicit versioning and are not implied by code modifications.
