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

export function buildListingWhere(params: ListingSearchParams): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = { status: "PUBLISHED" };

  const q = params.q?.trim();
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  if (params.category) {
    where.category = { slug: params.category };
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
  const where = buildListingWhere(params);
  const sort = parseSort(params.sort);
  const orderBy = buildOrderBy(sort);
  const page = Math.max(1, Math.trunc(Number(params.page)) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [listings, total, categories] = await Promise.all([
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
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return {
    listings,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    categories,
    sort,
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

export async function getNewestListings(limit = 3) {
  return prisma.listing.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      category: true,
      photos: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });
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
