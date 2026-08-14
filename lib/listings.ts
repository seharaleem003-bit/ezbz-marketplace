import { Prisma, ListingCondition } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const PAGE_SIZE = 12;

export const SORT_OPTIONS = ["newest", "price-asc", "price-desc", "deal-score-desc"] as const;
export type ListingSort = (typeof SORT_OPTIONS)[number];

const CONDITIONS: ListingCondition[] = ["NEW", "LIKE_NEW", "GOOD", "FAIR", "SALVAGE"];

export interface ListingSearchParams {
  q?: string;
  category?: string;
  condition?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  page?: string;
  prebook?: string;
}

function parseSort(sort?: string): ListingSort {
  return (SORT_OPTIONS as readonly string[]).includes(sort ?? "")
    ? (sort as ListingSort)
    : "newest";
}

function parseCondition(condition?: string): ListingCondition | undefined {
  return CONDITIONS.includes(condition as ListingCondition)
    ? (condition as ListingCondition)
    : undefined;
}

export interface CategoryNode {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
}

/**
 * Every category id at or beneath `slug`.
 *
 * Browsing "Pets" has to include everything filed under "Cat trees" and
 * "Dog play pens > Metal", otherwise parent categories look empty while their
 * children hold all the stock.
 */
export function collectCategoryIds(all: CategoryNode[], slug: string): string[] {
  const root = all.find((c) => c.slug === slug);
  if (!root) return [];

  const ids = [root.id];
  // Breadth-first so arbitrary nesting depth works without recursion limits.
  const queue = [root.id];
  while (queue.length > 0) {
    const parentId = queue.shift() as string;
    for (const child of all.filter((c) => c.parentId === parentId)) {
      ids.push(child.id);
      queue.push(child.id);
    }
  }
  return ids;
}

/** Ancestor chain for a category, root first, ending with the category itself. */
export function buildBreadcrumb(all: CategoryNode[], categoryId: string): CategoryNode[] {
  const chain: CategoryNode[] = [];
  let current = all.find((c) => c.id === categoryId);
  while (current) {
    chain.unshift(current);
    current = current.parentId
      ? all.find((c) => c.id === current!.parentId)
      : undefined;
  }
  return chain;
}

export function buildListingWhere(
  params: ListingSearchParams,
  categoryTree?: CategoryNode[]
): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = { status: "PUBLISHED" };

  const q = params.q?.trim();
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  if (params.category) {
    // With the tree loaded, roll a parent up to include its descendants;
    // without it, fall back to an exact match.
    const ids = categoryTree ? collectCategoryIds(categoryTree, params.category) : [];
    where.categoryId = ids.length > 0 ? { in: ids } : undefined;
    if (ids.length === 0) where.category = { slug: params.category };
  }

  // ?prebook=1 narrows to reservations; absent means "everything", so browse
  // still shows pre-book items alongside in-stock ones.
  if (params.prebook === "1") {
    where.isPrebook = true;
  }

  const condition = parseCondition(params.condition);
  if (condition) {
    where.condition = condition;
  }

  const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;
  const priceFilter: Prisma.IntFilter = {};
  if (minPrice !== undefined && !Number.isNaN(minPrice)) {
    priceFilter.gte = Math.round(minPrice * 100);
  }
  if (maxPrice !== undefined && !Number.isNaN(maxPrice)) {
    priceFilter.lte = Math.round(maxPrice * 100);
  }
  if (Object.keys(priceFilter).length > 0) {
    where.priceCents = priceFilter;
  }

  return where;
}

function buildOrderBy(sort: ListingSort): Prisma.ListingOrderByWithRelationInput {
  switch (sort) {
    case "price-asc":
      return { priceCents: "asc" };
    case "price-desc":
      return { priceCents: "desc" };
    case "deal-score-desc":
      return { dealScore: "desc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

export async function getListings(params: ListingSearchParams) {
  // Loaded before the query because the category filter needs the tree to
  // roll a parent up into its descendants.
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const where = buildListingWhere(params, categories);
  const sort = parseSort(params.sort);
  const orderBy = buildOrderBy(sort);
  const page = Math.max(1, Math.trunc(Number(params.page)) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      include: {
        category: true,
        photos: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    }),
    prisma.listing.count({ where }),
  ]);

  const selected = params.category
    ? categories.find((c) => c.slug === params.category) ?? null
    : null;

  return {
    listings,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    categories,
    sort,
    selectedCategory: selected,
    // Immediate children of the selection — the next drill-down level.
    subcategories: selected
      ? categories.filter((c) => c.parentId === selected.id)
      : categories.filter((c) => c.parentId === null),
    breadcrumb: selected ? buildBreadcrumb(categories, selected.id) : [],
  };
}

export async function getListingBySlug(slug: string) {
  return prisma.listing.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      category: true,
      photos: { orderBy: { sortOrder: "asc" } },
      videos: { orderBy: { createdAt: "asc" } },
      seller: {
        select: {
          id: true,
          displayName: true,
          city: true,
          region: true,
          badgeTier: true,
          stripeOnboardingComplete: true,
          createdAt: true,
        },
      },
    },
  });
}

export const PREBOOK_DISCOUNT_PERCENT = 10;

export async function getPrebookListings(limit = 4) {
  return prisma.listing.findMany({
    where: { status: "PUBLISHED", isPrebook: true },
    // Soonest release first — the closest thing to "arriving next".
    orderBy: { prebookReleaseAt: "asc" },
    take: limit,
    include: {
      category: true,
      photos: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });
}

export async function getNewestListings(limit = 3) {
  return prisma.listing.findMany({
    // Pre-book items get their own hero slide and homepage row, so keeping
    // them out of "Just listed" avoids showing the same thing twice.
    where: { status: "PUBLISHED", isPrebook: false },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      category: true,
      photos: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });
}

/**
 * "Buy these together" suggestions for the checkout page.
 *
 * Picks in-stock listings from the same categories the buyer is already
 * shopping, excluding what's in the cart. When the order is short of the
 * free-shipping threshold, items that would close that gap are ranked first —
 * the add-on both earns the buyer free delivery and lifts basket size.
 */
export async function getCrossSellListings({
  excludeListingIds,
  categoryIds,
  remainingForFreeCents,
  limit = 3,
}: {
  excludeListingIds: string[];
  categoryIds: string[];
  remainingForFreeCents: number;
  limit?: number;
}) {
  const candidates = await prisma.listing.findMany({
    where: {
      status: "PUBLISHED",
      inventoryQty: { gt: 0 },
      id: { notIn: excludeListingIds.length > 0 ? excludeListingIds : ["__none__"] },
      ...(categoryIds.length > 0 ? { categoryId: { in: categoryIds } } : {}),
    },
    orderBy: { dealScore: "desc" },
    take: 24,
    include: {
      category: true,
      photos: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });

  if (remainingForFreeCents <= 0) return candidates.slice(0, limit);

  // Closest price at or above the gap wins — that's the cheapest single add
  // that actually unlocks free shipping. Everything else keeps deal-score order.
  const closesGap = candidates
    .filter((listing) => listing.priceCents >= remainingForFreeCents)
    .sort((a, b) => a.priceCents - b.priceCents);

  const rest = candidates.filter((listing) => !closesGap.includes(listing));

  return [...closesGap, ...rest].slice(0, limit);
}

export async function getTopDealListings(limit = 8) {
  return prisma.listing.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { dealScore: "desc" },
    take: limit,
    include: {
      category: true,
      photos: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });
}
