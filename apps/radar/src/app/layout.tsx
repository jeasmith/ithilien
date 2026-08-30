import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Radar",
    template: "%s | Radar",
  },
  description:
    "An architectural digest — notes on the patterns, trade-offs, and decisions worth keeping an eye on.",
  // Radar is served from the shared microfrontends origin, not from its own
  // Vercel domain, so canonical URLs must resolve against that origin.
  metadataBase: new URL("https://www.ithilien.dev"),
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "Radar",
  },
};

/** Root layout that wraps every page with shared fonts, analytics, and base styles. */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="flex min-h-svh flex-col bg-background text-foreground">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
