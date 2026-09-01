import type { Metadata } from "next";
import Image from "next/image";
import QRCode from "qrcode";
import { Zap, WifiOff, Bell } from "lucide-react";

import { InstallPanel } from "./install-panel";

export const metadata: Metadata = {
  title: "Install the EZBZ app",
  description:
    "Add EZBZ to your home screen in seconds — no app store, no download, no account needed.",
};

export const dynamic = "force-dynamic";

const BENEFITS = [
  { icon: Zap, title: "Opens instantly", body: "Straight to the deals, full screen, no browser bar." },
  { icon: WifiOff, title: "Works on a bad signal", body: "Keeps working when your connection drops." },
  { icon: Bell, title: "Nothing to download", body: "No app store, no updates to install, no storage used." },
];

export default async function InstallPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const qrCodeDataUrl = await QRCode.toDataURL(`${appUrl}/install`, {
    margin: 1,
    width: 420,
    color: { dark: "#0a1930", light: "#ffffff" },
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <Image
          src="/logo.png"
          alt="EZBZ"
          width={200}
          height={80}
          className="mx-auto h-16 w-auto"
          priority
        />
        <h1 className="mt-6 font-heading text-3xl font-bold">Install the EZBZ app</h1>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          Add EZBZ to your home screen in about five seconds. No app store, no download, no
          account.
        </p>
      </div>

      <InstallPanel qrCodeDataUrl={qrCodeDataUrl} />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {BENEFITS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <Icon className="mb-2 size-5 text-gold-600" />
            <p className="font-semibold">{title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already shopping on EZBZ? Installing changes nothing about your account, cart or orders —
        it just puts a shortcut on your home screen.
      </p>
    </div>
  );
}
