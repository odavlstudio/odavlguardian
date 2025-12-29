# Guardian Reality Summary

## Final Verdict
- Verdict: FRICTION (exit 1)
- Why this verdict: Verdict unavailable; using conservative interpretation of observed evidence.
- Alternative verdicts not evaluated due to unknown state.
- Evidence reasons: CRITICAL_FLOW_FAILURE: Critical flows failed: contact_form. FLOW_FAILURE: Flow executions failed: signup_flow, login_flow, checkout_flow. MARKET_IMPACT: Market impact severity observed: CRITICAL. OBSERVED: Observed 4 attempted flow(s); successful=3, failed=1, friction=0. PARTIAL_SCOPE: Some flows observed (site_smoke, primary_ctas, contact_discovery_v2), but at least one flow failed or could not be confirmed. POLICY: ❌ Policy evaluation FAILED (exit code 1)

## What Guardian Observed
- Executed 4 attempt(s): contact_discovery_v2 (SUCCESS), contact_form (FAILURE), primary_ctas (SUCCESS), site_smoke (SUCCESS).

## What Guardian Could Not Confirm
- Failures detected in: contact_form (Step "fill_name" failed: Could not type into element: input[name="name"], input[data-testid="name"], input[data-guardian="name"]).
- Flow failures: checkout_flow, login_flow, signup_flow.
- Policy check failed: ❌ Policy evaluation FAILED (exit code 1)
- Coverage gaps: 2 planned attempt(s) not observed.

## Evidence Summary
- Attempt outcomes: executed=4, success=3, failed=1, skipped=2.
- Flow outcomes: success=0, failures=3, friction=0.
- Market severity observed: CRITICAL.
- Policy evaluation: failed (exit 1).
- Baseline comparison: none or no regressions detected.

## Limits of This Run
- Coverage: 4/6 attempts executed; gaps=2.
- User-filtered skips: 2.