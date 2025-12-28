import Link from "next/link";
import GlowBackdrop from "../../components/GlowBackdrop";

export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <main className="container" style={{ position: "relative" }}>
      <GlowBackdrop className="glow" />

      <section className="section-shell" aria-labelledby="privacy-head">
        <h1 className="section-title" id="privacy-head">Privacy Policy</h1>
        <p className="trust-head">
          We respect your privacy. This page explains in plain terms what
          information may be collected when you use this site and how it may be used.
        </p>
        <div className="glass-card p-6">
          <p>
            We do not sell personal data. If we collect analytics, it is to
            understand usage and improve the product experience. Where possible,
            we prefer privacy-friendly tools and minimize data collection.
          </p>
          <p>
            If you contact us or sign up for updates, we may store your email
            address to respond or send relevant information. You can opt out at
            any time by following the unsubscribe instructions.
          </p>
          <p>
            This is not legal advice. Policies may evolve as the product grows;
            we will update this page when that happens.
          </p>
        </div>
        <div className="mt-8">
          <Link href="/" className="btn btn-secondary" aria-label="Back to home">← Back to home</Link>
        </div>
      </section>
    </main>
  );
}
