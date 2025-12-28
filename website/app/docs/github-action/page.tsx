export const metadata = {
  title: "Guardian GitHub Action - Guardian",
  description: "Official Guardian GitHub Action documentation",
};

export default function GitHubAction() {
  return (
    <div>
      <h1>Guardian GitHub Action</h1>

      <p>
        The official Guardian GitHub Action provides the easiest way to integrate Guardian into your GitHub
        workflows.
      </p>

      <h2>Quick Start</h2>

      <pre><code>{`name: Guardian Reality Check

on: [pull_request, push]

jobs:
  guardian:
    runs-on: ubuntu-latest
    steps:
      - uses: odavlstudio/odavlguardian@v1
        with:
          url: https://staging.example.com
          preset: startup`}</code></pre>

      <h2>Inputs</h2>

      <table style={{ width: "100%", marginTop: "1rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <th style={{ textAlign: "left", padding: "0.75rem" }}>Input</th>
            <th style={{ textAlign: "left", padding: "0.75rem" }}>Required</th>
            <th style={{ textAlign: "left", padding: "0.75rem" }}>Default</th>
            <th style={{ textAlign: "left", padding: "0.75rem" }}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <td style={{ padding: "0.75rem" }}>
              <code>url</code>
            </td>
            <td style={{ padding: "0.75rem" }}>Yes</td>
            <td style={{ padding: "0.75rem" }}>—</td>
            <td style={{ padding: "0.75rem" }}>URL to check</td>
          </tr>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <td style={{ padding: "0.75rem" }}>
              <code>preset</code>
            </td>
            <td style={{ padding: "0.75rem" }}>No</td>
            <td style={{ padding: "0.75rem" }}>landing</td>
            <td style={{ padding: "0.75rem" }}>startup | saas | enterprise | landing-demo</td>
          </tr>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <td style={{ padding: "0.75rem" }}>
              <code>fail-on</code>
            </td>
            <td style={{ padding: "0.75rem" }}>No</td>
            <td style={{ padding: "0.75rem" }}>any</td>
            <td style={{ padding: "0.75rem" }}>none | friction | risk | any</td>
          </tr>
          <tr>
            <td style={{ padding: "0.75rem" }}>
              <code>artifacts</code>
            </td>
            <td style={{ padding: "0.75rem" }}>No</td>
            <td style={{ padding: "0.75rem" }}>.odavlguardian</td>
            <td style={{ padding: "0.75rem" }}>Output directory for artifacts</td>
          </tr>
        </tbody>
      </table>

      <h2>Outputs</h2>

      <table style={{ width: "100%", marginTop: "1rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <th style={{ textAlign: "left", padding: "0.75rem" }}>Output</th>
            <th style={{ textAlign: "left", padding: "0.75rem" }}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <td style={{ padding: "0.75rem" }}>
              <code>verdict</code>
            </td>
            <td style={{ padding: "0.75rem" }}>READY | FRICTION | DO_NOT_LAUNCH</td>
          </tr>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <td style={{ padding: "0.75rem" }}>
              <code>exit-code</code>
            </td>
            <td style={{ padding: "0.75rem" }}>0 (READY) | 1 (FRICTION) | 2 (DO_NOT_LAUNCH)</td>
          </tr>
          <tr>
            <td style={{ padding: "0.75rem" }}>
              <code>run-id</code>
            </td>
            <td style={{ padding: "0.75rem" }}>Unique run identifier</td>
          </tr>
        </tbody>
      </table>

      <h2>Examples</h2>

      <h3>Basic Workflow</h3>

      <pre><code>{`- uses: odavlstudio/odavlguardian@v1
  with:
    url: https://staging.example.com
    preset: startup
    fail-on: any`}</code></pre>

      <h3>With Environment Variable</h3>

      <pre><code>{`- uses: odavlstudio/odavlguardian@v1
  with:
    url: \${{ secrets.STAGING_URL }}
    preset: saas
    fail-on: friction`}</code></pre>

      <h3>Using Outputs</h3>

      <pre><code>{`- uses: odavlstudio/odavlguardian@v1
  id: guardian
  with:
    url: https://staging.example.com
    preset: startup

- name: Check result
  run: |
    echo "Verdict: \${{ steps.guardian.outputs.verdict }}"
    echo "Exit code: \${{ steps.guardian.outputs.exit-code }}"
    echo "Run ID: \${{ steps.guardian.outputs.run-id }}"`}</code></pre>

      <h2>Artifacts</h2>

      <p>The action uploads Guardian artifacts automatically. Access them in the Actions tab.</p>

      <p>To download artifacts in a follow-up step:</p>

      <pre><code>{`- uses: actions/download-artifact@v4
  with:
    name: guardian-\${{ steps.guardian.outputs.run-id }}
    path: ./reports`}</code></pre>

      <h2>Troubleshooting</h2>

      <h3>Action fails with "url is required"</h3>
      <p>Make sure you provide the <code>url</code> input:</p>

      <pre><code>with:
  url: https://your-site.com</code></pre>

      <h3>Guardian installed but not found</h3>
      <p>The action handles installation. If you see errors, ensure your runner has internet access.</p>

      <h3>Playwright browser installation fails</h3>
      <p>This rarely happens on GitHub runners. If it occurs, check system disk space and internet connectivity.</p>

      <h2>Next Steps</h2>
      <ul>
        <li>Set up <a href="/docs/ci-cd">CI/CD Integration</a></li>
        <li>Review <a href="/docs/presets">Presets</a> for advanced checks</li>
        <li>View the <a href="https://github.com/odavlstudio/odavlguardian">GitHub repository</a></li>
      </ul>
    </div>
  );
}
