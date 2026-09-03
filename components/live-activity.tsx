"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, ShoppingBag, Sparkles, X } from "lucide-react";

import type { ActivityEvent } from "@/lib/social-proof";

/**
 * Bottom-left pop-up showing recent shopper activity.
 *
 * Every card is a real event supplied by lib/social-proof.ts. Purposely
 * modest: it appears a few seconds after landing, shows a handful of cards
 * with gaps between them, then stops for the rest of the session. A ticker
 * that never stops reads as an advert; one that stops reads as a shop with
 * people in it.
 *
 * Dismissing it is remembered for the browser session, so it can't nag.
 */

const FIRST_DELAY_MS = 6_000;
const VISIBLE_MS = 6_500;
const GAP_MS = 22_000;
const MAX_PER_SESSION = 4;
const DISMISS_KEY = "ezbz.activity.dismissed";

function timeAgo(at: number): string {
  const mins = Math.max(1, Math.round((Date.now() - at) / 60_000));
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
}

export function LiveActivity({ events }: { events: ActivityEvent[] }) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Only the first few, and never more cards than there are real events.
  const queue = useMemo(() => events.slice(0, MAX_PER_SESSION), [events]);

  // sessionStorage throws in some privacy modes; a pop-up is not worth a
  // crashed page, so a failed read just means "not dismissed".
  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || dismissed || queue.length === 0) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return; // respect a stated preference for less movement
    }

    const schedule = (fn: () => void, ms: number) => {
      timers.current.push(setTimeout(fn, ms));
    };

    const showAt = (i: number, delay: number) => {
      schedule(() => {
        setIndex(i);
        setShown(true);
        schedule(() => setShown(false), VISIBLE_MS);
        if (i + 1 < queue.length) showAt(i + 1, VISIBLE_MS + GAP_MS);
      }, delay);
    };

    showAt(0, FIRST_DELAY_MS);

    const list = timers.current;
    return () => {
      list.forEach(clearTimeout);
      timers.current = [];
    };
  }, [ready, dismissed, queue.length]);

  if (!ready || dismissed || queue.length === 0) return null;

  const event = queue[index];
  if (!event) return null;

  const line =
    event.kind === "purchase"
      ? event.location
        ? `Someone in ${event.location} bought this`
        : "Someone bought this"
      : event.kind === "save"
        ? "Someone saved this"
        : "Just added to EZBZ";

  const Icon = event.kind === "save" ? Heart : event.kind === "listing" ? Sparkles : ShoppingBag;

  const card = (
    <div className="flex items-center gap-3">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-foreground/10">
        {event.photoUrl ? (
          <Image src={event.photoUrl} alt="" fill sizes="48px" className="object-contain p-0.5" />
        ) : (
          <span className="flex size-full items-center justify-center">
            <Icon className="size-5 text-muted-foreground" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {/* Gold in dark mode: the card turns navy there, so navy text on it
            would be unreadable. */}
        <p className="flex items-center gap-1.5 text-xs font-medium text-navy-800 dark:text-gold-400">
          <Icon className="size-3.5" />
          {line}
        </p>
        <p className="line-clamp-1 text-sm font-medium leading-snug">{event.title}</p>
        <p className="text-[11px] text-muted-foreground">{timeAgo(event.at)}</p>
      </div>
    </div>
  );

  return (
    <div
      aria-live="polite"
      className={[
        "pointer-events-none fixed bottom-4 left-4 z-40 w-[19rem] max-w-[calc(100vw-2rem)]",
        "transition-all duration-500 ease-out",
        shown ? "translate-x-0 opacity-100" : "-translate-x-6 opacity-0",
      ].join(" ")}
    >
      <div
        className={[
          "pointer-events-auto relative rounded-xl bg-card p-3 pr-8 shadow-lg ring-1 ring-foreground/10",
          shown ? "" : "invisible",
        ].join(" ")}
      >
        <button
          type="button"
          aria-label="Hide activity notifications"
          onClick={() => {
            setDismissed(true);
            try {
              sessionStorage.setItem(DISMISS_KEY, "1");
            } catch {
              /* ignore */
            }
          }}
          className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>

        {event.slug ? (
          <Link href={`/listings/${event.slug}`} className="block">
            {card}
          </Link>
        ) : (
          card
        )}
      </div>
    </div>
  );
}
