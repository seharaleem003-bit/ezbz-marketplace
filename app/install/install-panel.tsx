"use client";

import { useEffect, useState } from "react";
import { Download, Share, Plus, Check, MoreVertical } from "lucide-react";

import { Button } from "@/components/ui/button";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "desktop" | "unknown";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white">
        {n}
      </span>
      <span className="flex flex-wrap items-center gap-1.5 pt-0.5">{children}</span>
    </li>
  );
}

/**
 * Platform-aware install instructions.
 *
 * Detection happens on the client because it depends on the user agent, and
 * each platform genuinely differs: Android exposes an install API, iOS does
 * not, and desktop mostly wants to hand off to a phone.
 */
export function InstallPanel({ qrCodeDataUrl }: { qrCodeDataUrl: string }) {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setPlatform(
      /iphone|ipad|ipod/i.test(ua)
        ? "ios"
        : /android/i.test(ua)
          ? "android"
          : "desktop"
    );
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);

    const onPrompt = (e: Event) => {
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

  if (installed) {
    return (
      <div className="rounded-xl bg-card p-6 text-center ring-1 ring-foreground/10">
        <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-green-600 text-white">
          <Check className="size-6" />
        </span>
        <p className="font-heading text-lg font-semibold">EZBZ is installed</p>
        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;re using the app now. Look for the EZBZ icon on your home screen.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
      {installEvent ? (
        <div className="text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            One tap. No app store, no download, no account.
          </p>
          <Button
            size="lg"
            className="w-full"
            onClick={async () => {
              await installEvent.prompt();
              const { outcome } = await installEvent.userChoice;
              if (outcome === "accepted") setInstalled(true);
              setInstallEvent(null);
            }}
          >
            <Download />
            Install EZBZ
          </Button>
        </div>
      ) : platform === "ios" ? (
        <>
          <p className="mb-4 text-sm font-medium">On iPhone or iPad, in Safari:</p>
          <ol className="space-y-3 text-sm">
            <Step n={1}>
              Tap the Share button <Share className="inline size-4" /> at the bottom of Safari
            </Step>
            <Step n={2}>
              Scroll down and tap <strong>Add to Home Screen</strong>{" "}
              <Plus className="inline size-4" />
            </Step>
            <Step n={3}>
              Tap <strong>Add</strong> — EZBZ appears on your home screen
            </Step>
          </ol>
          <p className="mt-4 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            It has to be Safari. Chrome on iPhone can&apos;t install apps — that&apos;s an Apple
            restriction, not ours.
          </p>
        </>
      ) : platform === "android" ? (
        <>
          <p className="mb-4 text-sm font-medium">On Android, in Chrome:</p>
          <ol className="space-y-3 text-sm">
            <Step n={1}>
              Tap the menu <MoreVertical className="inline size-4" /> at the top right
            </Step>
            <Step n={2}>
              Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>
            </Step>
            <Step n={3}>
              Confirm — EZBZ appears in your app drawer
            </Step>
          </ol>
        </>
      ) : (
        <div className="text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            Scan this with your phone&apos;s camera to open EZBZ, then install it there.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI, next/image can't optimize it and doesn't need to */}
          <img
            src={qrCodeDataUrl}
            alt="QR code linking to ezbzmall.com/install"
            className="mx-auto size-52 rounded-lg"
          />
          <p className="mt-4 text-xs text-muted-foreground">
            You can also install on this computer from your browser&apos;s address bar — look for
            the install icon on the right.
          </p>
        </div>
      )}
    </div>
  );
}
