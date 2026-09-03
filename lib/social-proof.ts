import "server-only";

import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";

/**
 * Recent shopper activity, for the small pop-up on the storefront.
 *
 * Every event here is real: a paid order, or a listing someone actually
 * saved. Nothing is invented, and nothing is written — this module only
 * reads, so it can never touch stock, orders, or any other record.
 *
 * Buyers are identified by state only. A real first name would be real data,
 * but no customer agreed to have their name shown to strangers on a website,
 * and "Someone in Arizona" carries the same weight without naming anyone.
 */

export interface ActivityEvent {
  id: string;
  kind: "purchase" | "save" | "listing";
  /** Human place name, e.g. "Arizona". Null when the order had no usable state. */
  location: string | null;
  title: string;
  /** Null when the listing has since been deleted — the card then isn't a link. */
  slug: string | null;
  photoUrl: string | null;
  /** Epoch milliseconds; the client turns this into "2 hours ago". */
  at: number;
}

const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "Washington, D.C.",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

function stateName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (US_STATES[upper]) return US_STATES[upper];
  // Already a full name, or a non-US region — title-case it and move on.
  return trimmed
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const PURCHASE_WINDOW_DAYS = 45;
const SAVE_WINDOW_DAYS = 21;
const NEW_LISTING_WINDOW_DAYS = 30;

async function loadActivity(limit: number): Promise<ActivityEvent[]> {
  const purchaseSince = new Date(Date.now() - PURCHASE_WINDOW_DAYS * 86_400_000);
  const saveSince = new Date(Date.now() - SAVE_WINDOW_DAYS * 86_400_000);
  const listedSince = new Date(Date.now() - NEW_LISTING_WINDOW_DAYS * 86_400_000);

  const [orders, watches, fresh] = await Promise.all([
    // PAID only. TEST_MODE orders are the ones placed while wiring up
    // checkout — showing those would be exactly the fabrication this
    // module avoids.
    prisma.order.findMany({
      where: { paymentStatus: "PAID", createdAt: { gte: purchaseSince } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        shippingState: true,
        items: {
          take: 1,
          select: {
            id: true,
            titleAtPurchase: true,
            listing: {
              select: { slug: true, photos: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } },
            },
          },
        },
      },
    }),
    prisma.watch.findMany({
      where: { createdAt: { gte: saveSince }, listing: { status: "PUBLISHED" } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        listing: {
          select: {
            title: true,
            slug: true,
            photos: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
          },
        },
      },
    }),
    // Genuinely new stock. This is what a shop that has just opened has to
    // show instead of purchases, and it is true on the day it says it.
    prisma.listing.findMany({
      where: { status: "PUBLISHED", publishedAt: { gte: listedSince } },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        photos: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
    }),
  ]);

  const events: ActivityEvent[] = [];

  for (const order of orders) {
    const item = order.items[0];
    if (!item) continue;
    events.push({
      id: `order-${item.id}`,
      kind: "purchase",
      location: stateName(order.shippingState),
      title: item.titleAtPurchase,
      slug: item.listing?.slug ?? null,
      photoUrl: item.listing?.photos[0]?.url ?? null,
      at: order.createdAt.getTime(),
    });
  }

  for (const watch of watches) {
    events.push({
      id: `watch-${watch.id}`,
      kind: "save",
      location: null,
      title: watch.listing.title,
      slug: watch.listing.slug,
      photoUrl: watch.listing.photos[0]?.url ?? null,
      at: watch.createdAt.getTime(),
    });
  }

  for (const listing of fresh) {
    if (!listing.publishedAt) continue;
    events.push({
      id: `listing-${listing.id}`,
      kind: "listing",
      location: null,
      title: listing.title,
      slug: listing.slug,
      photoUrl: listing.photos[0]?.url ?? null,
      at: listing.publishedAt.getTime(),
    });
  }

  // One card per product: the same listing appearing five times in a row
  // reads as a glitch rather than as momentum.
  // A real purchase says more than a new arrival, so purchases lead and
  // new stock fills in behind them; recency breaks ties within a kind.
  const RANK: Record<ActivityEvent["kind"], number> = { purchase: 0, save: 1, listing: 2 };

  const seen = new Set<string>();
  return events
    .sort((a, b) => RANK[a.kind] - RANK[b.kind] || b.at - a.at)
    .filter((e) => {
      const key = e.slug ?? e.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

/**
 * Cached for a minute. This runs in the root layout, so an uncached query
 * would mean a database round trip on every page view site-wide.
 */
export const getRecentActivity = unstable_cache(
  async (limit = 8) => loadActivity(limit),
  ["storefront-recent-activity"],
  { revalidate: 60, tags: ["recent-activity"] }
);
