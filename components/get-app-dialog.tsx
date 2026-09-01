"use client";

import { useEffect, useState } from "react";
import { Download, Share, Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Beforeinstallprompt isn't in the DOM lib — Chromium-only, and the reason
 * Android gets a one-tap install while iOS needs written steps.
 */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function GetAppDialog({
  qrCodeDataUrl,
  label,
}: {
  qrCodeDataUrl: string;
  label: string;
}) {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);

    const onPrompt = (e: Event) => {
      // Chromium shows its own banner otherwise, at a moment we don't control.
      e.preventDefault();
      setInstallEvent(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

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

        <div className="flex flex-col items-center gap-4 py-2 text-center">
          {installed ? (
            <p className="text-sm text-muted-foreground">
              EZBZ is already installed on this device — you&apos;re using it now.
            </p>
          ) : installEvent ? (
            <>
              <p className="text-sm text-muted-foreground">
                Install EZBZ for a home screen icon, full screen shopping, and faster loads.
              </p>
              <Button
                onClick={async () => {
                  await installEvent.prompt();
                  const { outcome } = await installEvent.userChoice;
                  if (outcome === "accepted") setInstalled(true);
                  setInstallEvent(null);
                }}
                className="w-full"
              >
                <Download />
                Install EZBZ
              </Button>
            </>
          ) : isIos ? (
            // Safari has no install API, so iOS gets the actual tap sequence
            // rather than a button that would do nothing.
            <div className="w-full text-left text-sm">
              <p className="mb-2 text-center text-muted-foreground">
                Add EZBZ to your home screen:
              </p>
              <ol className="space-y-2">
                <li className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    1
                  </span>
                  Tap <Share className="size-4" /> in Safari&apos;s toolbar
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    2
                  </span>
                  Choose <Plus className="size-4" /> Add to Home Screen
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    3
                  </span>
                  Tap Add
                </li>
              </ol>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Open this page on your phone to install EZBZ — scan the code below.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI, next/image can't optimize it and doesn't need to */}
              <img src={qrCodeDataUrl} alt="QR code to open EZBZ on your phone" className="size-44" />
            </>
          )}

          <p className="text-xs text-muted-foreground">
            Works on iPhone and Android. No app store needed.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
