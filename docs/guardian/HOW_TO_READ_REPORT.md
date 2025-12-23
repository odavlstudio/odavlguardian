# How to Read a Guardian Report

The enhanced HTML report shows:

- Market Impact Summary
  - Highest severity, counts by severity
  - Top risks (with impact, domain)

- Attempts
  - Each attempt outcome: SUCCESS / FRICTION / FAILURE
  - Evidence: screenshots, traces

- Discovery
  - Pages visited, interactions discovered/executed

- Changes Since Last Run
  - Baseline regressions and improvements

- Visual Regression Details
  - Detected diffs: percent change, severity
  - Behavioral signals: hidden/disabled elements

## Interpreting Severity

- CRITICAL: Revenue/trust risks; block release
- WARNING: UX risks; fix soon
- INFO: Minor issues; monitor

## Evidence

- Screenshots linked per attempt/flow
- Trace files when enabled

## Policy Section

- Shows pass/fail with reasons
- Visual gates thresholds applied when configured
