import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { PromoBanner } from "@/components/promo-banner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SupportWidget } from "@/components/support-widget";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { LiveActivityFeed } from "@/components/live-activity-feed";

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
    default: "EZBZ Marketplace",
    template: "%s | EZBZ Marketplace",
  },
  description:
    "Discounted deals with Deal Score™ ratings, Amazon price comparisons, and video walkarounds.",
  // Lets iOS install EZBZ to the home screen and run it without Safari's
  // chrome; Android reads the same intent from the manifest.
  appleWebApp: {
    capable: true,
    title: "EZBZ",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a1930",
  // An installed app sits under the notch and home indicator, so the layout
  // is allowed into that space and pads itself back out.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <PromoBanner />
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter />
        <SupportWidget />
        {/* Suspense keeps its query off the critical path — the page renders
            without waiting, and the pop-up appears seconds later anyway. */}
        <Suspense fallback={null}>
          <LiveActivityFeed />
        </Suspense>
        <Toaster />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
