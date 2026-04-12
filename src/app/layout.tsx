import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

/**
 * App Router + `output: "export"`: pin the tree to static prerendering so
 * request-time APIs fail loudly during `next build` instead of slipping in
 * dynamic behavior. Vercel serves the resulting `out/` assets like any static
 * host; platform features (Analytics, Speed Insights, `vercel.json` headers)
 * stay at the edge layer.
 *
 * @see https://nextjs.org/docs/app/guides/static-exports
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamic
 */
export const dynamic = "force-static";

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
    default: "Ithilien",
    template: "%s | Ithilien",
  },
  description:
    "A place to try out new stuff and share what I learn. Personal projects, experiments, and writing by Jamie Smith.",
  metadataBase: new URL("https://ithilien.vercel.app"),
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "Ithilien",
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
