"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const plan = searchParams?.get("plan") || "pro";
  const [loading, setLoading] = useState(true);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const validPlans = ["pro", "business"];
    if (!validPlans.includes(plan.toLowerCase())) {
      setError("Invalid plan selected. Please choose Pro or Business.");
      setLoading(false);
      return;
    }

    // Generate checkout URL using the same logic as CLI
    const generateCheckoutUrl = (planId: string) => {
      const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY;
      
      if (!stripePublicKey) {
        // Fallback: provide instructions
        return `https://odavl.com/contact?upgrade=${planId}`;
      }

      // In production, this would call your Stripe API endpoint
      // For now, provide a contact link with the plan info
      return `https://odavl.com/contact?upgrade=${planId}`;
    };

    const url = generateCheckoutUrl(plan);
    setCheckoutUrl(url);
    setLoading(false);

    // Auto-redirect after 2 seconds
    const timer = setTimeout(() => {
      window.location.href = url;
    }, 2000);

    return () => clearTimeout(timer);
  }, [plan]);

  const planDetails = {
    pro: {
      name: "Pro",
      price: "$29/month",
      scans: "200 scans/month",
      sites: "3 sites",
      features: ["Live Guardian", "CI/CD integration", "Email & Slack alerts"]
    },
    business: {
      name: "Business",
      price: "$99/month",
      scans: "Unlimited scans",
      sites: "Unlimited sites",
      features: ["Live Guardian", "CI/CD integration", "Advanced analytics", "Dedicated support"]
    }
  };

  const details = planDetails[plan.toLowerCase() as keyof typeof planDetails] || planDetails.pro;

  if (error) {
    return (
      <main className="container" style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <h1 style={{ color: "var(--danger)", marginBottom: "1rem" }}>❌ {error}</h1>
        <Link href="/#pricing" className="btn btn-primary">View Pricing</Link>
      </main>
    );
  }

  return (
    <main className="container" style={{ padding: "4rem 2rem", maxWidth: "600px", textAlign: "center" }}>
      <h1 style={{ marginBottom: "1rem" }}>🚀 Upgrade to {details.name}</h1>
      
      <div style={{ 
        background: "rgba(255,255,255,0.05)", 
        padding: "2rem", 
        borderRadius: "12px",
        marginBottom: "2rem",
        textAlign: "left"
      }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>{details.price}</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0" }}>
          <li style={{ margin: "0.5rem 0" }}>✓ {details.scans}</li>
          <li style={{ margin: "0.5rem 0" }}>✓ {details.sites}</li>
          {details.features.map((feature, i) => (
            <li key={i} style={{ margin: "0.5rem 0" }}>✓ {feature}</li>
          ))}
        </ul>
      </div>

      {loading ? (
        <div>
          <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
            Preparing your checkout...
          </p>
          <div className="spinner" style={{ 
            width: "40px", 
            height: "40px", 
            border: "3px solid rgba(255,255,255,0.1)",
            borderTop: "3px solid var(--glow-1)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto"
          }} />
        </div>
      ) : (
        <div>
          <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
            Redirecting to checkout...
          </p>
          <a href={checkoutUrl} className="btn btn-primary" style={{ marginTop: "1rem" }}>
            Continue to Checkout →
          </a>
          <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "var(--muted)" }}>
            <Link href="/#pricing" style={{ color: "var(--glow-1)" }}>← Back to pricing</Link>
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
