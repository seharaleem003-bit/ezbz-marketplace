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
    // Line items whose listing was deleted have no listingId; skip them.
    where: {
      orderId: { in: orderIds },
      AND: [{ listingId: { not: listingId } }, { listingId: { not: null } }],
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });
  const siblingIds = siblings.map((s) => s.listingId).filter((id): id is string => id !== null);
  if (siblingIds.length === 0) return [];

  const listings = (await prisma.listing.findMany({
    where: { id: { in: siblingIds }, status: "PUBLISHED" },
    select: SELECT,
  })) as RawListing[];

  // Preserve co-purchase ranking, which the id-based lookup loses.
  const order = new Map(siblings.map((s, i) => [s.listingId, i]));
  return listings
    .sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99))
    .map(shape);
}

/**
 * One companion to bundle with the listing.
 *
 * Real co-purchase data wins when it exists. Until then the companion comes
 * from the *same* category — a second playpen accessory, another light for the
 * same room — widening only as far as the parent category if the leaf holds
 * nothing else. An earlier version reached across "complementary" departments
 * and paired a baby playpen with a dress-form mannequin, which is exactly the
 * kind of suggestion that makes a shop look automated rather than curated.
 */
export async function getBoughtTogether({
  listingId,
  categoryId,
  priceCents,
}: {
  listingId: string;
  categoryId: string;
  priceCents: number;
}): Promise<{ item: RecommendedListing | null; basis: "co-purchase" | "same-category" }> {
  const real = await getCoPurchased(listingId, 1);
  if (real.length > 0) return { item: real[0], basis: "co-purchase" };

  const base = {
    status: "PUBLISHED" as const,
    inventoryQty: { gt: 0 },
    isPrebook: false,
    id: { not: listingId },
  };

  // Same leaf first.
  let candidates = (await prisma.listing.findMany({
    where: { ...base, categoryId },
    take: 20,
    select: SELECT,
  })) as RawListing[];

  // Then the parent category — siblings of the leaf, never a different
  // department.
  if (candidates.length === 0) {
    const tree = (await prisma.category.findMany({
      select: { id: true, slug: true, name: true, parentId: true, sortOrder: true },
    })) as CategoryNode[];
    const node = tree.find((c) => c.id === categoryId);
    const parent = node?.parentId ? tree.find((c) => c.id === node.parentId) : null;
    if (parent) {
      const ids = collectCategoryIds(tree, parent.slug);
      candidates = (await prisma.listing.findMany({
        where: { ...base, categoryId: { in: ids } },
        take: 20,
        select: SELECT,
      })) as RawListing[];
    }
  }

  if (candidates.length === 0) return { item: null, basis: "same-category" };

  // A companion priced near the main item reads as a natural pair; one at
  // triple the price reads as an upsell.
  const best = candidates.sort(
    (a, b) => Math.abs(a.priceCents - priceCents) - Math.abs(b.priceCents - priceCents)
  )[0];

  return { item: shape(best), basis: "same-category" };
}
