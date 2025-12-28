"use client";

export const dynamic = "force-dynamic";
import GlowBackdrop from "../components/GlowBackdrop";
import Link from "next/link";
import { useState } from "react";

export default function Page() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <main className="container">
      {/* Ambient glow behind hero */}
      <GlowBackdrop className="glow" />

      <section className="hero">
        <h1>Guardian — Reality checks for your website</h1>
        <p>
          Guardian tests what actually happens to users before they discover it. A virtual human visits your site and tells you what breaks.
        </p>
        <div className="cta-row" role="navigation" aria-label="Primary actions">
          <Link href="/install" className="btn btn-primary" aria-label="Install Guardian">Install & Run Guardian</Link>
          <Link
            href="/report/sample"
            className="btn btn-secondary"
            aria-label="View sample report"
          >
            View sample report
          </Link>
        </div>
      </section>

      <section className="trust-strip" aria-label="Used by">
        <p className="trust-head">
          For founders, developers, and teams who care about reality.
        </p>
      </section>

      <section className="section-shell" aria-labelledby="early-access-head">
        <article className="glass-card p-6" style={{ background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1))" }}>
          <h3 id="early-access-head" style={{ margin: "0 0 0.5rem", fontSize: "1.125rem" }}>�️ Open Source & Free</h3>
          <p style={{ margin: "0 0 1rem", color: "var(--muted)" }}>Guardian is open source and free to use. No signup required, no limits on scans.</p>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <a 
              href="https://github.com/odavlstudio/odavlguardian"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              aria-label="View on GitHub"
            >
              View on GitHub →
            </a>
            <Link 
              href="/docs"
              className="btn btn-secondary"
              aria-label="Read documentation"
            >
              Documentation
            </Link>
          </div>
        </article>
      </section>

      <section className="section-shell" aria-labelledby="value-head">
        <p className="section-label">What Guardian catches</p>
        <h2 className="section-title" id="value-head">Issues that quietly break launches</h2>
        <div className="card-grid">
          <article className="value-card">
            <h3>Broken pages & dead links</h3>
            <p>Pages that fail, redirect incorrectly, or silently break.</p>
          </article>
          <article className="value-card">
            <h3>Missing SEO fundamentals</h3>
            <p>Titles, meta tags, and indexing gaps that hurt discoverability.</p>
          </article>
          <article className="value-card">
            <h3>Trust & credibility gaps</h3>
            <p>Missing policies, broken CTAs, and weak trust signals.</p>
          </article>
          <article className="value-card">
            <h3>Performance & UX red flags</h3>
            <p>Slow loads, layout shifts, and obvious friction points.</p>
          </article>
        </div>
      </section>

      <section className="section-shell" aria-labelledby="how-head">
        <p className="section-label">How it works</p>
        <h2 className="section-title" id="how-head">From URL to clear answers in minutes</h2>
        <div className="steps-grid">
          <article className="step-card">
            <span className="step-num">01</span>
            <h3>Enter a live URL</h3>
            <p>Point Guardian at your real website — no setup required.</p>
          </article>
          <article className="step-card">
            <span className="step-num">02</span>
            <h3>Run a reality check</h3>
            <p>Guardian scans pages, signals, and launch-critical risks.</p>
          </article>
          <article className="step-card">
            <span className="step-num">03</span>
            <h3>Review a clear report</h3>
            <p>Get prioritized issues you can fix before shipping.</p>
          </article>
        </div>
      </section>

      <section className="section-shell" aria-labelledby="quick-start-head">
        <p className="section-label">Get started</p>
        <h2 className="section-title" id="quick-start-head">Install and run in 2 commands</h2>
        <div className="quick-start-cards">
          <article className="quick-start-card">
            <span className="quick-start-num">1</span>
            <p className="quick-start-title">Install</p>
            <code className="quick-start-code">npm install -g @odavl/guardian</code>
            <button className="quick-start-copy" onClick={() => copyToClipboard("npm install -g @odavl/guardian", "install")} aria-label="Copy install command">
              {copied === "install" ? "Copied!" : "Copy"}
            </button>
          </article>
          <article className="quick-start-card">
            <span className="quick-start-num">2</span>
            <p className="quick-start-title">Run</p>
            <code className="quick-start-code">guardian --url https://example.com</code>
            <button className="quick-start-copy" onClick={() => copyToClipboard("guardian --url https://example.com", "run")} aria-label="Copy run command">
              {copied === "run" ? "Copied!" : "Copy"}
            </button>
          </article>
        </div>
      </section>

      <section className="section-shell" aria-labelledby="sample-head">
        <p className="section-label">Sample output</p>
        <h2 className="section-title" id="sample-head">See what Guardian reports</h2>
        <div className="report-card" role="region" aria-label="Sample scan result">
          <div className="report-line">
            <span>Scan result for:</span>
            <strong>example.com</strong>
          </div>
          <div className="report-line">
            <span>Verdict:</span>
            <strong className="report-status" style={{ color: "#22c55e" }}>✓ READY</strong>
          </div>
          <hr className="report-divider" />
          <p style={{ margin: "1rem 0 0.5rem", fontSize: "0.9rem", color: "var(--muted)" }}>Coverage: 92% · Confidence: HIGH</p>
          <ul className="report-list">
            <li>✓ Navigation flows work correctly</li>
            <li>✓ Primary CTAs are accessible</li>
            <li>✓ No server errors detected</li>
            <li>✓ Core user journeys successful</li>
          </ul>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <Link href="/report/sample" className="btn btn-secondary" aria-label="View full demo report">
            View full demo report
          </Link>
        </div>
      </section>

      <section className="final-cta" aria-label="Final call to action">
        {/* Subtle ambient glow behind close section */}
        <GlowBackdrop className="final-glow" />
        <h2>Ready to check your reality?</h2>
        <p>Guardian is free, open source, and requires no setup.</p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginTop: "2rem" }}>
          <Link href="/install" className="btn btn-primary" aria-label="Install Guardian">Install Guardian</Link>
          <a 
            href="https://github.com/odavlstudio/odavlguardian"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            aria-label="View on GitHub"
          >
            GitHub
          </a>
        </div>
      </section>

      <footer className="footer" aria-label="Footer">
        <div className="container footer-inner">
          <div className="footer-left">
            <div>© ODAVL Guardian</div>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>
              Open source and free. <a href="https://github.com/odavlstudio/odavlguardian" target="_blank" rel="noopener noreferrer" style={{ color: "var(--glow-1)", textDecoration: "none" }}>GitHub</a>
            </p>
          </div>
          <nav className="footer-right" aria-label="Footer links">
            <Link href="/install" aria-label="Install">Install</Link>
            <a
              href="https://github.com/odavlstudio/odavlguardian"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              GitHub
            </a>
            <Link href="/privacy" aria-label="Privacy">Privacy</Link>
            <Link href="/terms" aria-label="Terms">Terms</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
