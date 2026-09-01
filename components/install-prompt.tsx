"use client";

import { useEffect, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Shared install state.
 *
 * Chromium fires `beforeinstallprompt` once, early, and only if the app isn't
 * already installed. Capturing it in one place means any button can trigger
 * the real install later — the event has to be saved when it arrives, not
 * requested when a button is clicked.
 */
export function useInstall() {
  const [event, setEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
        // iOS reports standalone on navigator, not via media query.
        (window.navigator as { standalone?: boolean }).standalone === true
    );

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!event) return false;
    await event.prompt();
    const { outcome } = await event.userChoice;
    setEvent(null);
    if (outcome === "accepted") setInstalled(true);
    return outcome === "accepted";
  };

  return { canInstall: Boolean(event), installed, isIos, install };
}

/** The iOS tap sequence, used wherever a real install button can't be offered. */
export function IosSteps() {
  return (
    <ol className="space-y-2 text-left text-sm">
      <li className="flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
          1
        </span>
        Tap <Share className="size-4" /> in Safari&apos;s toolbar
      </li>
      <li className="flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
          2
        </span>
        Tap <Plus className="size-4" /> <strong>Add to Home Screen</strong>
      </li>
      <li className="flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
          3
        </span>
        Tap <strong>Add</strong>
      </li>
    </ol>
  );
}

/**
 * The "install EZBZ?" panel that greets someone arriving from the QR code.
 *
 * Appears by itself, which is the point — the visitor scanned a code to get
 * here, so they shouldn't have to hunt for a button. On Android the Yes button
 * opens Chrome's real install dialog; Chrome requires a tap to do that, so a
 * genuinely automatic install isn't possible on any platform.
 */
export function AutoInstallPrompt() {
  const { canInstall, installed, isIos, install } = useInstall();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || installed || (!canInstall && !isIos)) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-96 sm:rounded-xl sm:border">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </button>

      <p className="pr-6 font-heading text-lg font-semibold">Install the EZBZ app?</p>

      {canInstall ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Adds EZBZ to your home screen. No app store, no download.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              className="flex-1"
              onClick={async () => {
                const ok = await install();
                if (!ok) setDismissed(true);
              }}
            >
              <Download />
              Yes, install
            </Button>
            <Button variant="outline" onClick={() => setDismissed(true)}>
              Not now
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="mb-3 mt-1 text-sm text-muted-foreground">
            Add EZBZ to your home screen in three taps:
          </p>
          <IosSteps />
        </>
      )}
    </div>
  );
}
