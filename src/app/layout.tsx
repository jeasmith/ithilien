import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
      </body>
    </html>
  );
}
