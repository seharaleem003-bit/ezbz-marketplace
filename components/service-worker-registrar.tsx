"use client";

import { useEffect } from "react";

/**
 * Registers the service worker, which is what lets the site be installed and
 * survive a dropped connection.
 *
 * Registration is skipped in development: a cached shell during local work
 * produces stale pages that look like real bugs.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        // Registration failing costs offline support, not the site itself.
        console.warn("Service worker registration failed", error);
      });
    };

    // Deferred so registration never competes with the first paint.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
