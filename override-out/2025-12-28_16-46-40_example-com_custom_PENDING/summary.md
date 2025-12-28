# Guardian Reality Summary

## Final Verdict
- Verdict: PARTIAL (exit 1)
- Why this verdict: Evidence is mixed: 3 failed flow(s); policy not satisfied.
- Not OBSERVED because at least one failure, friction, or policy issue remains.
- Not INSUFFICIENT_DATA because 1 attempt(s) executed and produced evidence.
- Evidence reasons: FLOW_FAILURE: Flow executions failed: signup_flow, login_flow, checkout_flow. MARKET_IMPACT: Market impact severity observed: WARNING. OBSERVED: Observed 1 attempted flow(s); successful=1, failed=0, friction=0. PARTIAL_SCOPE: Some flows observed (site_smoke), but at least one flow failed or could not be confirmed. POLICY: ⚠️  Policy evaluation WARNING (exit code 2)

## What Guardian Observed
- Executed 1 attempt(s): site_smoke (SUCCESS).

## What Guardian Could Not Confirm
- Flow failures: checkout_flow, login_flow, signup_flow.
- Policy check failed: ⚠️  Policy evaluation WARNING (exit code 2)
- Coverage gaps: 5 planned attempt(s) not observed.

## Evidence Summary
- Attempt outcomes: executed=1, success=1, failed=0, skipped=5.
- Flow outcomes: success=0, failures=3, friction=0.
- Market severity observed: WARNING.
- Policy evaluation: failed (exit 2).
- Baseline regressions: none.

## Limits of This Run
- Coverage: 1/6 attempts executed; gaps=5.
- User-filtered skips: 3.