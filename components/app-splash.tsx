"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Brand screen shown while the installed app starts.
 *
 * iOS covers this itself with the images in app/layout.tsx, but Android
 * derives its splash from the manifest icon and cannot show the wordmark, and
 * a desktop install gets nothing at all. This fills both gaps with the same
 * lockup, so the app opens the same way everywhere.
 *
 * Deliberately narrow:
 * - Installed app only. On the website a splash is an obstacle between a
 *   shopper and the page they asked for.
 * - Once per launch, not per navigation, tracked in sessionStorage.
 * - Purely decorative and non-blocking: it sits above the page, which has
 *   already rendered underneath, and removes itself on a timer. If the
 *   timer never ran the page is still fully usable behind it, so it also
 *   fades on the first tap.
 */

const SEEN_KEY = "ezbz.splash.shown";
const HOLD_MS = 1100;
const FADE_MS = 420;

export function AppSplash() {
  const [state, setState] = useState<"hidden" | "visible" | "fading">("hidden");

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari predates the display-mode media query.
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!standalone) return;

    try {
      if (sessionStorage.getItem(SEEN_KEY) === "1") return;
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Private mode can throw on both calls; showing it once anyway is fine.
    }

    setState("visible");
    const fade = setTimeout(() => setState("fading"), HOLD_MS);
    const done = setTimeout(() => setState("hidden"), HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, []);

  if (state === "hidden") return null;

  return (
    <div
      aria-hidden
      onClick={() => setState("hidden")}
      className={[
        "fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5",
        "bg-navy-900 transition-opacity ease-out motion-reduce:transition-none",
        state === "fading" ? "pointer-events-none opacity-0" : "opacity-100",
      ].join(" ")}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <Image
        src="/logo-light.png"
        alt=""
        width={1378}
        height={554}
        priority
        className="w-[62vw] max-w-xs"
      />

      {/* Rule — MALL — rule, matching the iOS launch images exactly. */}
      <div className="flex items-center gap-4">
        <span className="h-px w-10 bg-gold-500/70" />
        <span className="text-lg font-semibold tracking-[0.42em] text-gold-500 sm:text-xl">
          MALL
        </span>
        <span className="h-px w-10 bg-gold-500/70" />
      </div>
    </div>
  );
}
