export const metadata = {
  title: "CI/CD Integration - Guardian",
  description: "Integrate Guardian into your CI/CD pipeline with enterprise resilience",
};

export default function CICDPage() {
  return (
    <div>
      <h1>CI/CD Integration</h1>

      <p>
        Guardian integrates with GitHub Actions, GitLab CI, and Bitbucket Pipelines with enterprise-grade resilience built in: automatic retry logic, caching, timeout protection, and deterministic verdicts.
      </p>

      <h2>GitHub Actions (Recommended)</h2>

      <p>Use the official Guardian GitHub Action. It includes automatic retry (3 attempts), Playwright browser caching, timeout guards, and npm cache persistence.</p>

      <h3>Basic Setup</h3>

      <pre><code>{`name: Guardian Check
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  guardian:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: odavlstudio/odavlguardian@v1
        with:
          url: https://example.com
          preset: startup
          fail-on: any
`}</code></pre>

      <h3>Advanced Setup (Production)</h3>

      <pre><code>{`name: Guardian with Full Resilience
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  guardian:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions:
      contents: read
      pull-requests: write
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      
      - uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-v1.48.2-\${{ runner.os }}
          restore-keys: playwright-v1.48.2-\${{ runner.os }}
      
      - uses: odavlstudio/odavlguardian@v1
        with:
          url: \${{ secrets.STAGING_URL }}
          preset: startup
          fail-on: any
          artifacts: .odavlguardian
      
      - name: Comment verdict on PR
        if: github.event.pull_request
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: 'Guardian reality check completed.'
            });
`}</code></pre>

      <h3>Action Resilience Features</h3>

      <ul>
        <li><strong>Automatic retry</strong>: 3 attempts with exponential backoff (2s, 5s)</li>
        <li><strong>Caching</strong>: Playwright browsers (1-2 min savings), npm cache</li>
        <li><strong>Timeout protection</strong>: 5 minute execution limit (10 minute job timeout)</li>
        <li><strong>URL validation</strong>: Validates http/https URL before execution</li>
        <li><strong>Decision validation</strong>: Verifies decision.json format and verdict enum</li>
      </ul>

      <h3>Action Inputs</h3>

      <table style={{ width: "100%", marginTop: "1rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <th style={{ textAlign: "left", padding: "0.75rem" }}>Input</th>
            <th style={{ textAlign: "left", padding: "0.75rem" }}>Required</th>
            <th style={{ textAlign: "left", padding: "0.75rem" }}>Default</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <td style={{ padding: "0.75rem" }}>url</td>
            <td style={{ padding: "0.75rem" }}>✓ Yes</td>
            <td style={{ padding: "0.75rem" }}>—</td>
          </tr>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <td style={{ padding: "0.75rem" }}>preset</td>
            <td style={{ padding: "0.75rem" }}>No</td>
            <td style={{ padding: "0.75rem" }}>landing</td>
          </tr>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <td style={{ padding: "0.75rem" }}>fail-on</td>
            <td style={{ padding: "0.75rem" }}>No</td>
            <td style={{ padding: "0.75rem" }}>any</td>
          </tr>
          <tr>
            <td style={{ padding: "0.75rem" }}>artifacts</td>
            <td style={{ padding: "0.75rem" }}>No</td>
            <td style={{ padding: "0.75rem" }}>.odavlguardian</td>
          </tr>
        </tbody>
      </table>

      <h3>Action Outputs</h3>

      <ul>
        <li><code>verdict</code>: READY | FRICTION | DO_NOT_LAUNCH</li>
        <li><code>exit-code</code>: 0 | 1 | 2</li>
        <li><code>run-id</code>: Unique run identifier</li>
      </ul>

      <h2>GitLab CI</h2>

      <p>Guardian runs with automatic caching, retry logic, and timeout protection.</p>

      <pre><code>{`stages:
  - scan

variables:
  GUARDIAN_URL: \${CI_ENVIRONMENT_URL}

cache:
  paths:
    - ~/.npm
    - ~/.cache/ms-playwright

guardian:scan:
  stage: scan
  image: node:20
  timeout: 15 minutes
  retry:
    max: 2
    when:
      - runner_system_failure
      - stuck_or_timeout_failure
      - script_failure
  before_script:
    - npm ci
    - npx playwright install --with-deps chromium
  script:
    - mkdir -p artifacts/guardian
    - |
      npx -y @odavl/guardian reality \\
        --url "\$GUARDIAN_URL" \\
        --artifacts "artifacts/guardian" \\
        --preset startup
  artifacts:
    paths:
      - artifacts/guardian/**
    expire_in: 30 days
    when: always
  only:
    - main
    - merge_requests

guardian:validate:
  stage: scan
  image: node:20
  dependencies:
    - guardian:scan
  script:
    - |
      DECISION=\$(find artifacts/guardian -name "decision.json" | head -1)
      [ -f "\$DECISION" ] || exit 1
      VERDICT=\$(node -e "console.log(JSON.parse(require('fs').readFileSync('\$DECISION')).finalVerdict)")
      echo "Verdict: \$VERDICT"
  only:
    - main
    - merge_requests
`}</code></pre>

      <h3>GitLab Resilience Features</h3>

      <ul>
        <li><strong>Cache</strong>: npm and Playwright persisted (3x faster)</li>
        <li><strong>Retry</strong>: Up to 2 retries on infrastructure or timeout failures</li>
        <li><strong>Timeout</strong>: 15 minute job limit (10 min for Guardian execution)</li>
        <li><strong>Validation</strong>: Separate job validates decision.json before proceeding</li>
        <li><strong>Artifacts</strong>: 30 day retention</li>
      </ul>

      <h2>Bitbucket Pipelines</h2>

      <p>Guardian runs with caching and timeout protection. Automatic retries are configured at the repository level.</p>

      <pre><code>{`image: node:20

definitions:
  caches:
    npm: ~/.npm
    playwright: ~/.cache/ms-playwright

  steps:
    - step: &guardian-check
        name: Guardian Reality Check
        max-time: 15
        caches:
          - npm
          - playwright
        script:
          - npm ci
          - npx playwright install --with-deps chromium
          - mkdir -p artifacts/guardian
          - |
            GUARDIAN_URL="\${GUARDIAN_URL}"
            [ -z "\$GUARDIAN_URL" ] && { echo "GUARDIAN_URL not set"; exit 1; }
            npx -y @odavl/guardian reality \\
              --url "\$GUARDIAN_URL" \\
              --artifacts "artifacts/guardian" \\
              --preset startup
        artifacts:
          - artifacts/guardian/**
        after-script:
          - |
            DECISION=\$(find artifacts/guardian -name "decision.json" | head -1)
            [ -f "\$DECISION" ] && \\
              echo "Verdict: \$(node -e \"console.log(JSON.parse(require('fs').readFileSync('\$DECISION')).finalVerdict)\")"

pipelines:
  default:
    - step: *guardian-check
  branches:
    main:
      - step: *guardian-check
    develop:
      - step: *guardian-check

options:
  max-time: 30
`}</code></pre>

      <h3>Bitbucket Resilience Features</h3>

      <ul>
        <li><strong>Cache</strong>: npm and Playwright cached between runs</li>
        <li><strong>Timeout</strong>: 15 minute per-step limit, 30 minute pipeline limit</li>
        <li><strong>Repository variables</strong>: Configure GUARDIAN_URL as secure variable</li>
        <li><strong>Validation</strong>: After-script validates decision.json</li>
      </ul>

      <h2>Resilience Patterns (All Platforms)</h2>

      <h3>Automatic Retry Logic</h3>

      <ul>
        <li><strong>Max attempts</strong>: 3 (initial + 2 retries)</li>
        <li><strong>Retry delays</strong>: 3s, then 8s (exponential backoff)</li>
        <li><strong>Retryable</strong>: Network timeouts, Playwright crashes, npm errors</li>
        <li><strong>Non-retryable</strong>: Guardian verdicts (always final)</li>
      </ul>

      <h3>Timeout Guards</h3>

      <ul>
        <li><strong>Explicit timeouts</strong>: Prevent infinite hangs</li>
        <li><strong>Exit code 124</strong>: Timeout signals failure (not masked)</li>
        <li><strong>Infrastructure timeout</strong>: Job/step timeout is always higher than Guardian timeout</li>
      </ul>

      <h3>Caching Strategy</h3>

      <ul>
        <li><strong>Playwright browsers</strong>: Cached by OS + version (1-2 min savings)</li>
        <li><strong>npm cache</strong>: Cached by lockfile hash (30-60s savings)</li>
        <li><strong>Safety</strong>: Cache invalidation on version change</li>
      </ul>

      <h2>Failure Policies</h2>

      <table style={{ width: "100%", marginTop: "1rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <th style={{ textAlign: "left", padding: "0.75rem" }}>Policy</th>
            <th style={{ textAlign: "left", padding: "0.75rem" }}>Fails On</th>
            <th style={{ textAlign: "left", padding: "0.75rem" }}>When to Use</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <td style={{ padding: "0.75rem" }}>any</td>
            <td style={{ padding: "0.75rem" }}>FRICTION or DO_NOT_LAUNCH</td>
            <td style={{ padding: "0.75rem" }}>Strict quality gate</td>
          </tr>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <td style={{ padding: "0.75rem" }}>risk</td>
            <td style={{ padding: "0.75rem" }}>Only DO_NOT_LAUNCH</td>
            <td style={{ padding: "0.75rem" }}>Allow friction, block critical issues</td>
          </tr>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <td style={{ padding: "0.75rem" }}>friction</td>
            <td style={{ padding: "0.75rem" }}>Only FRICTION</td>
            <td style={{ padding: "0.75rem" }}>Catch all problems early</td>
          </tr>
          <tr>
            <td style={{ padding: "0.75rem" }}>none</td>
            <td style={{ padding: "0.75rem" }}>Never</td>
            <td style={{ padding: "0.75rem" }}>Observe only; never block</td>
          </tr>
        </tbody>
      </table>

      <h2>Environment Variables</h2>

      <p>Override Guardian behavior with environment variables:</p>

      <ul>
        <li><code>GUARDIAN_PRESET</code>: startup | saas | enterprise | landing-demo</li>
        <li><code>GUARDIAN_FAIL_ON</code>: any | risk | friction | none</li>
        <li><code>GUARDIAN_CONFIG</code>: Path to guardian.config.json</li>
        <li><code>GUARDIAN_TIMEOUT</code>: Timeout in seconds (default: 300)</li>
      </ul>

      <h2>Determinism & Reliability</h2>

      <ul>
        <li><strong>Deterministic verdicts</strong>: Same URL + preset = same verdict (unless target site changes)</li>
        <li><strong>Retries don't mask verdicts</strong>: Guardian verdicts are final; never retried</li>
        <li><strong>Timeout is explicit</strong>: Exit code 124 signals timeout; CI/CD fails clearly</li>
        <li><strong>No silent failures</strong>: All failure modes exit non-zero with clear signals</li>
      </ul>

      <h2>Next Steps</h2>

      <ul>
        <li>Choose your CI/CD platform and copy the configuration</li>
        <li>Set GUARDIAN_URL or target URL</li>
        <li>Select failure policy (any, risk, friction, none)</li>
        <li>Run your first check and review the verdict</li>
        <li>Review <a href="/docs/presets">Presets & Policies</a> to adjust checks as needed</li>
      </ul>
    </div>
  );
}
