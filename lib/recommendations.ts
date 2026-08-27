import "server-only";

import { prisma } from "@/lib/prisma";
import { collectCategoryIds, type CategoryNode } from "@/lib/listings";

/**
 * Product-page recommendations.
 *
 * Two genuinely different questions, so two different algorithms:
 *
 * - "Similar" means substitutes — the same kind of thing at a comparable
 *   price, for a shopper deciding between options.
 * - "Bought together" means complements — what people actually purchased in
 *   the same order, for a shopper who has already decided.
 *
 * Co-purchase is computed from real OrderItem history. Until enough orders
 * exist for that signal to mean anything, it falls back to complementary
 * categories rather than showing an empty shelf or, worse, dressing up
 * "similar" as "bought together" — which would recommend a second dog playpen
 * to someone buying a dog playpen.
 */

const MIN_COPURCHASE_ORDERS = 3;

export interface RecommendedListing {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  retailPriceCents: number | null;
  amazonPriceCents: number | null;
  inventoryQty: number;
  isPrebook: boolean;
  photoUrl: string | null;
  categoryName: string;
}

const SELECT = {
  id: true,
  slug: true,
  title: true,
  priceCents: true,
  retailPriceCents: true,
  amazonPriceCents: true,
  inventoryQty: true,
  isPrebook: true,
  category: { select: { name: true } },
  photos: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } },
};

type RawListing = {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  retailPriceCents: number | null;
  amazonPriceCents: number | null;
  inventoryQty: number;
  isPrebook: boolean;
  category: { name: string };
  photos: { url: string }[];
};

function shape(l: RawListing): RecommendedListing {
  return {
    id: l.id,
    slug: l.slug,
    title: l.title,
    priceCents: l.priceCents,
    retailPriceCents: l.retailPriceCents,
    amazonPriceCents: l.amazonPriceCents,
    inventoryQty: l.inventoryQty,
    isPrebook: l.isPrebook,
    photoUrl: l.photos[0]?.url ?? null,
    categoryName: l.category.name,
  };
}

/**
 * Substitutes: same category, then widening to the parent if that's too thin,
 * ranked by how close the price is to what the shopper is already looking at.
 */
export async function getSimilarListings({
  listingId,
  categoryId,
  priceCents,
  limit = 6,
}: {
  listingId: string;
  categoryId: string;
  priceCents: number;
  limit?: number;
}): Promise<RecommendedListing[]> {
  const base = {
    status: "PUBLISHED" as const,
    id: { not: listingId },
  };

  let candidates = (await prisma.listing.findMany({
    where: { ...base, categoryId },
    take: 40,
    select: SELECT,
  })) as RawListing[];

  // A leaf category like "Acrylic" can hold only a couple of items; widen to
  // the whole department before giving up.
  if (candidates.length < limit) {
    const tree = (await prisma.category.findMany({
      select: { id: true, slug: true, name: true, parentId: true, sortOrder: true },
    })) as CategoryNode[];
    const node = tree.find((c) => c.id === categoryId);
    let rootSlug = node?.slug;
    let cursor = node;
    while (cursor?.parentId) {
      cursor = tree.find((c) => c.id === cursor?.parentId);
      if (cursor) rootSlug = cursor.slug;
    }
    if (rootSlug) {
      const ids = collectCategoryIds(tree, rootSlug);
      const wider = (await prisma.listing.findMany({
        where: { ...base, categoryId: { in: ids } },
        take: 60,
        select: SELECT,
      })) as RawListing[];
      const seen = new Set(candidates.map((c) => c.id));
      candidates = [...candidates, ...wider.filter((w) => !seen.has(w.id))];
    }
  }

  return candidates
    .sort((a, b) => Math.abs(a.priceCents - priceCents) - Math.abs(b.priceCents - priceCents))
    .slice(0, limit)
    .map(shape);
}

/**
 * Complements, from orders that actually contained this listing.
 *
 * Returns an empty array when the co-purchase signal is too thin to trust, so
 * the caller can fall back rather than present noise as insight.
 */
async function getCoPurchased(listingId: string, limit: number): Promise<RecommendedListing[]> {
  const orderIds = (
    await prisma.orderItem.findMany({
      where: { listingId, order: { paymentStatus: "PAID" } },
      select: { orderId: true },
    })
  ).map((o) => o.orderId);

  if (orderIds.length < MIN_COPURCHASE_ORDERS) return [];

  const siblings = await prisma.orderItem.groupBy({
    by: ["listingId"],
    where: { orderId: { in: orderIds }, listingId: { not: listingId } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });
  if (siblings.length === 0) return [];

  const listings = (await prisma.listing.findMany({
    where: { id: { in: siblings.map((s) => s.listingId) }, status: "PUBLISHED" },
    select: SELECT,
  })) as RawListing[];

  // Preserve co-purchase ranking, which the id-based lookup loses.
  const order = new Map(siblings.map((s, i) => [s.listingId, i]));
  return listings
    .sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99))
    .map(shape);
}

/**
 * Categories that complement each other — used until real co-purchase data
 * exists. Keyed by department slug; anything unlisted falls back to other
 * departments, which is still better than recommending a near-duplicate.
 */
const COMPLEMENTS: Record<string, string[]> = {
  pets: ["home-kitchen", "tools-hardware"],
  "home-kitchen": ["home-decor", "tools-hardware", "beauty-personal-care"],
  "tools-hardware": ["home-kitchen", "mobility"],
  mobility: ["tools-hardware", "fitness-outdoors"],
  "baby-kids": ["home-kitchen", "beauty-personal-care"],
  "beauty-personal-care": ["home-kitchen", "baby-kids"],
  "fitness-outdoors": ["mobility", "beauty-personal-care"],
  electronics: ["home-kitchen", "tools-hardware"],
};

export async function getBoughtTogether({
  listingId,
  categoryId,
  limit = 4,
}: {
  listingId: string;
  categoryId: string;
  limit?: number;
}): Promise<{ items: RecommendedListing[]; basis: "co-purchase" | "complementary" }> {
  const real = await getCoPurchased(listingId, limit);
  if (real.length > 0) return { items: real, basis: "co-purchase" };

  const tree = (await prisma.category.findMany({
    select: { id: true, slug: true, name: true, parentId: true, sortOrder: true },
  })) as CategoryNode[];

  // Walk up to the department this listing sits in.
  let cursor = tree.find((c) => c.id === categoryId);
  let deptSlug = cursor?.slug;
  while (cursor?.parentId) {
    cursor = tree.find((c) => c.id === cursor?.parentId);
    if (cursor) deptSlug = cursor.slug;
  }

  const wanted = (deptSlug && COMPLEMENTS[deptSlug]) || [];
  const ids = wanted.flatMap((slug) => collectCategoryIds(tree, slug));

  const items = (await prisma.listing.findMany({
    where: {
      status: "PUBLISHED",
      inventoryQty: { gt: 0 },
      isPrebook: false,
      id: { not: listingId },
      ...(ids.length > 0 ? { categoryId: { in: ids } } : {}),
    },
    orderBy: [{ dealScore: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: SELECT,
  })) as RawListing[];

  return { items: items.map(shape), basis: "complementary" };
}
