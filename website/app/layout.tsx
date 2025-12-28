import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://odavlguardian.vercel.app"),
  title: "ODAVL Guardian — Reality-based website checks before you ship",
  description:
    "Run fast, reality-based checks on your live website to catch broken pages, SEO gaps, and trust issues before launch.",
  openGraph: {
    title: "ODAVL Guardian — Reality-based website checks before you ship",
    description:
      "Run fast, reality-based checks on your live website to catch broken pages, SEO gaps, and trust issues before launch.",
    type: "website",
    images: ["/og-placeholder.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "ODAVL Guardian — Reality-based website checks before you ship",
    description:
      "Run fast, reality-based checks on your live website to catch broken pages, SEO gaps, and trust issues before launch.",
    images: ["/og-placeholder.png"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="premium-bg">
        {/* Content wrapper ensures glow sits behind */}
        <div style={{ position: "relative", minHeight: "100vh" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
