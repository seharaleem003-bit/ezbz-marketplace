"use client";

import { Download, Check } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useInstall, IosSteps } from "@/components/install-prompt";

export function GetAppDialog({
  qrCodeDataUrl,
  label,
}: {
  qrCodeDataUrl: string;
  label: string;
}) {
  const { canInstall, installed, isIos, install } = useInstall();

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            size="sm"
            className="rounded-full bg-gold-500 text-navy-900 hover:bg-gold-400"
          />
        }
      >
        {label}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogTitle className="text-center text-xl">
          Get the free EZ<span className="text-gold-500">BZ</span> app
        </DialogTitle>

        {installed ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-green-600 text-white">
              <Check className="size-6" />
            </span>
            <p className="text-sm text-muted-foreground">
              EZBZ is already installed on this device.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            {/* QR and button together, rather than one or the other: the code
                is for moving to a phone, the button installs on the device
                you're holding. Which one is useful depends on where you are. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI, next/image can't optimize it and doesn't need to */}
            <img
              src={qrCodeDataUrl}
              alt="Scan to install EZBZ on your phone"
              className="size-44 rounded-lg"
            />
            <p className="text-sm text-muted-foreground">
              Scan with your phone&apos;s camera — it&apos;ll offer to install EZBZ.
            </p>

            <div className="flex w-full items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                or on this device
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            {canInstall ? (
              <Button className="w-full" onClick={install}>
                <Download />
                Install EZBZ
              </Button>
            ) : isIos ? (
              <div className="w-full">
                <IosSteps />
              </div>
            ) : (
              // Chromium only fires the install event on a supported browser
              // over HTTPS. Saying so beats a dead button.
              <p className="text-xs text-muted-foreground">
                Your browser can&apos;t install apps. Open ezbzmall.com in Chrome, Edge, or
                Safari on your phone.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
