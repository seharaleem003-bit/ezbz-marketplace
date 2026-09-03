"use client";

import Link from "next/link";
import { Download, Check, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useInstall, IosSteps } from "@/components/install-prompt";

/**
 * The "get the app" block on a product page.
 *
 * Replaces two store buttons that linked to "#" — there is no store listing
 * and there won't be one soon, so they were a dead promise. This offers what
 * actually exists: a real one-tap install where the browser supports it,
 * Safari's add-to-home-screen steps where it doesn't, and a QR code that
 * lands on /install so a desktop visitor can finish on their phone.
 */
export function AppInstallCard({
  qrCodeDataUrl,
  heading,
}: {
  qrCodeDataUrl: string;
  heading: string;
}) {
  const { canInstall, installed, isIos, install } = useInstall();

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/40 p-4">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-medium">
          <Smartphone className="size-4 text-gold-600" />
          {heading}
        </p>

        {installed ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Check className="size-4 text-green-600" />
            You&apos;re already using the EZBZ app.
          </p>
        ) : canInstall ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Home screen icon, full screen, faster loads. No app store, no download.
            </p>
            <Button size="sm" className="mt-3" onClick={install}>
              <Download />
              Install EZBZ
            </Button>
          </>
        ) : isIos ? (
          <div className="mt-2">
            <IosSteps />
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Scan with your phone to install EZBZ — no app store, no download.
            </p>
            <Link
              href="/install"
              className="mt-2 inline-block text-sm font-medium text-navy-800 underline underline-offset-4"
            >
              Or open the install page
            </Link>
          </>
        )}
      </div>

      {/* Hidden once installed on this device — the code is for getting the
          app onto a phone, which is already done. */}
      {!installed ? (
        // eslint-disable-next-line @next/next/no-img-element -- a data: URI, next/image can't optimize it and doesn't need to
        <img
          src={qrCodeDataUrl}
          alt="QR code to install the EZBZ app"
          className="size-24 shrink-0 rounded-md"
        />
      ) : null}
    </div>
  );
}
