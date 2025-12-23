import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "ODAVL Guardian | Market Reality Testing Engine",
  description:
    "Guardian simulates the first real user to decide READY or DO_NOT_LAUNCH before you ship to the market.",
  icons: {
    icon: "/favicon.svg"
  },
  openGraph: {
    type: "website",
    title: "ODAVL Guardian | Market Reality Testing Engine",
    description: "Guardian simulates the first real user to decide READY or DO_NOT_LAUNCH before you ship to the market.",
    siteName: "ODAVL Guardian",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ODAVL Guardian - Market Reality Testing Engine"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "ODAVL Guardian | Market Reality Testing Engine",
    description: "Guardian simulates the first real user to decide READY or DO_NOT_LAUNCH before you ship to the market.",
    images: ["/og-image.png"]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} grain`}>
        {children}
      </body>
    </html>
  );
}
