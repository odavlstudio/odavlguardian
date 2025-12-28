"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import GlowBackdrop from "../../../components/GlowBackdrop";

type Decision = {
  runId?: string;
  url?: string;
  timestamp?: string;
  finalVerdict?: string;
  exitCode?: number;
  reasons?: { code?: string; message?: string }[];
  coverage?: { total?: number; executed?: number; gaps?: number };
  inputs?: {
    market?: {
      highestSeverity?: string;
      countsBySeverity?: Record<string, number>;
      topRisks?: { attemptId?: string; severity?: string; humanReadableReason?: string }[];
    };
  };
};

const DEFAULT_SAMPLE_ROOT = "/sample-artifacts";

function verdictColor(verdict?: string) {
  if (!verdict) return "var(--muted)";
  const v = verdict.toUpperCase();
  if (v === "READY") return "#22c55e";
  if (v === "FRICTION") return "#f97316";
  if (v === "DO_NOT_LAUNCH") return "#ef4444";
  return "var(--muted)";
}

function formatDate(ts?: string) {
  if (!ts) return "";
  const d = new Date(ts);
  return isNaN(d.getTime()) ? ts : d.toUTCString();
}

export default function SampleReportPage() {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [summaryMd, setSummaryMd] = useState<string | null>(null);
  const [manifest, setManifest] = useState<{ files?: { path: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"summary" | "json">("summary");

  useEffect(() => {
    const load = async () => {
      try {
        // Try to load pointer from LATEST.json; fallback to default path
        let sampleRoot = DEFAULT_SAMPLE_ROOT;
        try {
          const latestRes = await fetch(`/LATEST.json`);
          if (latestRes.ok) {
            const latest = await latestRes.json();
            if (latest?.path && typeof latest.path === "string") {
              sampleRoot = latest.path;
            }
          }
        } catch (_) {
          // ignore — fallback to default path
        }

        const [decisionRes, summaryRes, manifestRes] = await Promise.all([
          fetch(`${sampleRoot}/decision.json`),
          fetch(`${sampleRoot}/summary.md`),
          fetch(`${sampleRoot}/manifest.json`)
        ]);

        if (!decisionRes.ok) throw new Error(`Failed to load decision.json (${decisionRes.status})`);

        const decisionJson: Decision = await decisionRes.json();
        setDecision(decisionJson);

        if (summaryRes.ok) {
          setSummaryMd(await summaryRes.text());
        }
        if (manifestRes.ok) {
          setManifest(await manifestRes.json());
        }
      } catch (err: any) {
        setError(err?.message || "Unable to load sample artifacts");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const coverageText = useMemo(() => {
    if (!decision?.coverage) return "";
    const executed = decision.coverage.executed ?? 0;
    const total = decision.coverage.total ?? 0;
    const pct = total > 0 ? Math.round((executed / total) * 100) : 0;
    return `${executed}/${total} (${pct}%)`;
  }, [decision]);

  return (
    <main className="container">
      <GlowBackdrop className="glow" />

      <section className="section-shell" aria-labelledby="sample-head">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1 className="section-title" id="sample-head">Sample Guardian Report</h1>
            <p className="trust-head">Live render of a real Guardian run against https://example.com</p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            <a className="btn btn-primary" href={`${DEFAULT_SAMPLE_ROOT}/report.html`} target="_blank" rel="noopener noreferrer" aria-label="Open full HTML report">Open HTML report</a>
            <a className="btn btn-secondary" href="/sample-artifacts.zip" download aria-label="Download sample artifacts zip">Download artifacts (.zip)</a>
          </div>
        </div>

        {loading && (
          <div className="glass-card p-6" style={{ marginTop: "1.5rem" }}>
            <p style={{ margin: 0 }}>Loading real sample artifacts…</p>
          </div>
        )}

        {error && !loading && (
          <div className="glass-card p-6" style={{ marginTop: "1.5rem", border: "1px solid #ef4444" }}>
            <p style={{ margin: 0, color: "#ef4444" }}>Failed to load sample data: {error}</p>
          </div>
        )}

        {!loading && decision && (
          <div style={{ marginTop: "1.5rem" }}>
            <div className="glass-card p-6" style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: "0 0 0.25rem", color: "var(--muted)", fontSize: "0.95rem" }}>Run ID</p>
                  <h2 style={{ margin: "0", fontSize: "1.25rem" }}>{decision.runId}</h2>
                  <p style={{ margin: "0.25rem 0", color: "var(--muted)", fontSize: "0.9rem" }}>Target: {decision.url}</p>
                  <p style={{ margin: "0", color: "var(--muted)", fontSize: "0.9rem" }}>Timestamp: {formatDate(decision.timestamp)}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: "0 0 0.35rem", color: "var(--muted)" }}>Final verdict</p>
                  <span style={{ fontSize: "1.75rem", fontWeight: 700, color: verdictColor(decision.finalVerdict) }}>{decision.finalVerdict}</span>
                  <p style={{ margin: "0.25rem 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>Exit code: {decision.exitCode}</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "1.25rem" }}>
                <article className="glass-card" style={{ padding: "1rem", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)" }}>
                  <p style={{ margin: "0 0 0.35rem", fontSize: "0.9rem", color: "var(--muted)" }}>Coverage executed</p>
                  <strong style={{ fontSize: "1.25rem" }}>{coverageText}</strong>
                </article>
                <article className="glass-card" style={{ padding: "1rem", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}>
                  <p style={{ margin: "0 0 0.35rem", fontSize: "0.9rem", color: "var(--muted)" }}>Market severity</p>
                  <strong style={{ fontSize: "1.25rem" }}>{decision.inputs?.market?.highestSeverity || "unknown"}</strong>
                </article>
                <article className="glass-card" style={{ padding: "1rem", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)" }}>
                  <p style={{ margin: "0 0 0.35rem", fontSize: "0.9rem", color: "var(--muted)" }}>Risk counts</p>
                  <strong style={{ fontSize: "1.25rem" }}>
                    {(decision.inputs?.market?.countsBySeverity?.CRITICAL || 0)} critical /
                    {(decision.inputs?.market?.countsBySeverity?.WARNING || 0)} warning /
                    {(decision.inputs?.market?.countsBySeverity?.INFO || 0)} info
                  </strong>
                </article>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
              <article className="glass-card p-6">
                <h3 style={{ margin: "0 0 0.75rem" }}>Reasons</h3>
                <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--muted)" }}>
                  {(decision.reasons || []).map((reason, idx) => (
                    <li key={`${reason.code}-${idx}`} style={{ marginBottom: "0.5rem" }}>
                      <strong style={{ color: "var(--glow-2)" }}>{reason.code}</strong> — {reason.message}
                    </li>
                  ))}
                  {!decision.reasons?.length && <li>No reasons reported.</li>}
                </ul>
              </article>

              <article className="glass-card p-6">
                <h3 style={{ margin: "0 0 0.75rem" }}>Top risks</h3>
                <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--muted)" }}>
                  {(decision.inputs?.market?.topRisks || []).slice(0, 5).map((risk, idx) => (
                    <li key={`${risk.attemptId}-${idx}`} style={{ marginBottom: "0.5rem" }}>
                      <strong>{risk.severity}</strong> — {risk.humanReadableReason}
                    </li>
                  ))}
                  {!decision.inputs?.market?.topRisks?.length && <li>No market risks recorded.</li>}
                </ul>
              </article>
            </div>

            <div className="glass-card p-6" style={{ marginTop: "1rem" }}>
              <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: "1rem", flexWrap: "wrap" }}>
                <button
                  onClick={() => setActiveTab("summary")}
                  className="btn btn-secondary"
                  style={{
                    background: activeTab === "summary" ? "rgba(34,197,94,0.15)" : "transparent",
                    borderColor: "rgba(34,197,94,0.4)",
                    color: activeTab === "summary" ? "#22c55e" : "var(--muted)",
                    padding: "0.6rem 1rem"
                  }}
                >
                  Summary
                </button>
                <button
                  onClick={() => setActiveTab("json")}
                  className="btn btn-secondary"
                  style={{
                    background: activeTab === "json" ? "rgba(59,130,246,0.15)" : "transparent",
                    borderColor: "rgba(59,130,246,0.4)",
                    color: activeTab === "json" ? "#3b82f6" : "var(--muted)",
                    padding: "0.6rem 1rem"
                  }}
                >
                  Raw JSON
                </button>
              </div>

              {activeTab === "summary" && (
                <div>
                  <p style={{ color: "var(--muted)", marginBottom: "0.75rem" }}>Rendered from latest golden sample</p>
                  <pre
                    style={{
                      background: "rgba(0, 0, 0, 0.25)",
                      padding: "1rem",
                      borderRadius: "8px",
                      overflow: "auto",
                      fontSize: "0.9rem"
                    }}
                  >
                    {summaryMd || "No summary available."}
                  </pre>
                </div>
              )}

              {activeTab === "json" && (
                <div>
                  <p style={{ color: "var(--muted)", marginBottom: "0.75rem" }}>decision.json (real output)</p>
                  <pre
                    style={{
                      background: "rgba(0, 0, 0, 0.25)",
                      padding: "1rem",
                      borderRadius: "8px",
                      overflow: "auto",
                      fontSize: "0.85rem",
                      maxHeight: "500px",
                      color: "#10b981"
                    }}
                  >
                    {JSON.stringify(decision, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <article className="glass-card p-6" style={{ marginTop: "1rem" }}>
              <h3 style={{ margin: "0 0 0.75rem" }}>Artifact bundle contents</h3>
              <p style={{ margin: "0 0 0.75rem", color: "var(--muted)" }}>Preview of files shipped in the downloadable bundle.</p>
              <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--muted)" }}>
                {(manifest?.files || []).slice(0, 8).map((file, idx) => (
                  <li key={`${file.path}-${idx}`} style={{ marginBottom: "0.4rem" }}>{file.path}</li>
                ))}
                {!manifest?.files?.length && <li>No manifest entries available.</li>}
              </ul>
            </article>

            <div className="glass-card p-6" style={{ marginTop: "1rem", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)" }}>
              <h3 style={{ margin: "0 0 0.5rem" }}>Regenerate this sample locally</h3>
              <p style={{ margin: "0 0 0.75rem", color: "var(--muted)" }}>Runs Guardian against https://example.com and rebuilds the bundle.</p>
              <pre
                style={{
                  background: "rgba(0,0,0,0.25)",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  overflow: "auto"
                }}
              >
                npm run sample:generate
              </pre>
              <p style={{ margin: "0.5rem 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
                Output saved to website/public/sample-artifacts and zipped to website/public/sample-artifacts.zip
              </p>
            </div>

            <div className="mt-8" style={{ marginTop: "1.5rem" }}>
              <Link href="/docs" className="btn btn-secondary" aria-label="Back to docs">← Back to docs</Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
