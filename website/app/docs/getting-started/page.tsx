export const metadata = {
  title: "Installation - Guardian",
  description: "Install Guardian and run your first reality check",
};

export default function GettingStarted() {
  return (
    <div>
      <h1>Installation</h1>

      <h2>Requirements</h2>
      <ul>
        <li><strong>Node.js</strong> 18.0.0 or higher</li>
        <li><strong>npm</strong> 9.0.0 or higher</li>
        <li><strong>200MB disk space</strong> for Playwright browsers (downloaded on first run)</li>
      </ul>

      <p>Check your versions:</p>
      <pre><code>node --version && npm --version</code></pre>

      <h2>Install Guardian</h2>

      <h3>Global Installation (Recommended)</h3>
      <p>Install Guardian globally so you can use it from any directory:</p>
      <pre><code>npm install -g @odavl/guardian</code></pre>

      <p>Verify the installation:</p>
      <pre><code>guardian --version</code></pre>

      <h3>Using npx (No Installation)</h3>
      <p>Run Guardian without installing it:</p>
      <pre><code>npx @odavl/guardian --url https://example.com</code></pre>

      <h3>Local Project Installation</h3>
      <p>Install as a dev dependency in your project:</p>
      <pre><code>npm install --save-dev @odavl/guardian</code></pre>

      <p>Then run with:</p>
      <pre><code>npx guardian --url https://example.com</code></pre>

      <h2>First Run</h2>
      <p>
        On first run, Guardian downloads Playwright browsers (~200MB). This takes 1–2 minutes but only happens once.
      </p>

      <p>After installation, run:</p>
      <pre><code>guardian --url https://example.com</code></pre>

      <p>Replace <code>https://example.com</code> with your website URL.</p>

      <h2>Output</h2>
      <p>Guardian saves results to <code>./.odavlguardian/&lt;timestamp&gt;_&lt;domain&gt;/</code></p>

      <p>Key files:</p>
      <ul>
        <li><code>decision.json</code> — Structured verdict and findings</li>
        <li><code>summary.md</code> — Human-readable report</li>
        <li><code>META.json</code> — Run metadata (timing, coverage, attempts)</li>
        <li><code>market-report.html</code> — Full interactive report</li>
      </ul>

      <h2>Verdicts</h2>
      <p>Guardian gives one of three verdicts:</p>
      <ul>
        <li><strong>READY</strong> (exit code 0) — Safe to launch</li>
        <li><strong>FRICTION</strong> (exit code 1) — Users will struggle</li>
        <li><strong>DO_NOT_LAUNCH</strong> (exit code 2) — Critical issues blocking launch</li>
      </ul>

      <h2>Next Steps</h2>
      <ul>
        <li>Read <a href="/docs/first-run">Your First Run</a> for a walkthrough</li>
        <li>Explore <a href="/docs/presets">Presets & Policies</a> for advanced checks</li>
        <li>Set up <a href="/docs/ci-cd">CI/CD Integration</a> for automated checks</li>
      </ul>
    </div>
  );
}
