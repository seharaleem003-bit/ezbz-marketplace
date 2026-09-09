import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Finds listings that look like the same product as one being added.
 *
 * Three signals, strongest first. They are deliberately different in kind:
 * an ASIN is an identifier, a slug is a derived identifier, and title
 * similarity is a guess. Reporting which one fired lets the operator judge a
 * match instead of trusting a number they can't see the basis for.
 *
 * Archived listings count. Re-adding something you archived last month is
 * exactly the duplicate worth catching, and the fix is usually to unarchive
 * and restock rather than to create a second record.
 */

export type MatchReason = "asin" | "slug" | "title";

export interface DuplicateCandidate {
  id: string;
  title: string;
  slug: string;
  status: string;
  condition: string;
  priceCents: number;
  inventoryQty: number;
  photoUrl: string | null;
  categoryName: string;
  amazonUrl: string | null;
  /** Units on paid orders. Zero means nothing has sold, so it is safe to merge. */
  unitsSold: number;
  reason: MatchReason;
  /** 0-1. Exact identifier matches are 1. */
  score: number;
}

/** Amazon puts the product id in the path: /dp/B0XXXXXXXX or /gp/product/B0XX… */
export function extractAsin(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/(?:dp|gp\/product|gp\/aw\/d|product)\/([A-Z0-9]{10})(?:[/?]|$)/i);
  return m ? m[1].toUpperCase() : null;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Below this, trigram similarity is noise rather than a likely duplicate. */
const TITLE_THRESHOLD = 0.55;
const MAX_CANDIDATES = 6;

export async function findDuplicateListings({
  title,
  amazonUrl,
  slug,
  excludeId,
}: {
  title: string;
  amazonUrl?: string | null;
  slug?: string | null;
  excludeId?: string | null;
}): Promise<DuplicateCandidate[]> {
  const trimmed = title.trim();
  if (trimmed.length < 4) return [];

  const asin = extractAsin(amazonUrl);
  const candidateSlug = slug?.trim() || slugify(trimmed);

  const hits = new Map<string, { reason: MatchReason; score: number }>();
  const remember = (id: string, reason: MatchReason, score: number) => {
    const existing = hits.get(id);
    if (!existing || score > existing.score) hits.set(id, { reason, score });
  };

  // 1. Same Amazon product. An ASIN is the product's identity, so this is not
  //    a guess — it is the same item.
  if (asin) {
    const byAsin = await prisma.listing.findMany({
      where: { amazonUrl: { contains: asin, mode: "insensitive" } },
      select: { id: true },
    });
    for (const l of byAsin) remember(l.id, "asin", 1);
  }

  // 2. Same slug, or the numbered variants the create path generates when a
  //    slug is taken ("-2", "-3"), which are themselves usually duplicates.
  const bySlug = await prisma.listing.findMany({
    where: { OR: [{ slug: candidateSlug }, { slug: { startsWith: `${candidateSlug}-` } }] },
    select: { id: true },
  });
  for (const l of bySlug) remember(l.id, "slug", 1);

  // 3. Similar name. Uses the pg_trgm index added for typo-tolerant search.
  const byTitle = await prisma.$queryRaw<{ id: string; sim: number }[]>`
    SELECT id, similarity(title, ${trimmed}) AS sim
    FROM "Listing"
    WHERE similarity(title, ${trimmed}) > ${TITLE_THRESHOLD}
    ORDER BY similarity(title, ${trimmed}) DESC
    LIMIT 20`;
  for (const l of byTitle) remember(l.id, "title", Number(l.sim));

  if (excludeId) hits.delete(excludeId);
  if (hits.size === 0) return [];

  const listings = await prisma.listing.findMany({
    where: { id: { in: [...hits.keys()] } },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      condition: true,
      priceCents: true,
      inventoryQty: true,
      amazonUrl: true,
      category: { select: { name: true } },
      photos: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      orderItems: {
        where: { order: { paymentStatus: "PAID" } },
        select: { quantity: true },
      },
    },
  });

  return listings
    .map((l) => {
      const hit = hits.get(l.id)!;
      return {
        id: l.id,
        title: l.title,
        slug: l.slug,
        status: l.status,
        condition: l.condition,
        priceCents: l.priceCents,
        inventoryQty: l.inventoryQty,
        photoUrl: l.photos[0]?.url ?? null,
        categoryName: l.category.name,
        amazonUrl: l.amazonUrl,
        unitsSold: l.orderItems.reduce((sum, oi) => sum + oi.quantity, 0),
        reason: hit.reason,
        score: hit.score,
      };
    })
    .sort((a, b) => b.score - a.score || a.unitsSold - b.unitsSold)
    .slice(0, MAX_CANDIDATES);
}
