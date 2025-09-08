import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ensureOpentelemetryIsInitialized, emitLog, emitMetric } from "@/lib/opentelemetry";

// Initialize OpenTelemetry
ensureOpentelemetryIsInitialized();

// Emit a log and metric when the app starts
emitLog("Frontend application started", "INFO");
emitMetric("frontend.app.start", 1, { "page": "layout" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SaaS Platform",
  description: "Multi-tenant SaaS application template",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}