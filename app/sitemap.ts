import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";

/**
 * Sitemap, built from live data.
 *
 * Without one, Google has to find products by crawling links and will miss
 * anything buried deep in the category tree. Only PUBLISHED listings appear —
 * a sitemap that advertises drafts and archived stock teaches Google the site
 * is full of dead URLs.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://ezbzmall.com").replace(/\/$/, "");

  const [listings, categories] = await Promise.all([
    prisma.listing.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.category.findMany({ select: { slug: true } }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/listings`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/install`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.1 },
  ];

  return [
    ...staticPages,
    // Category listings are the pages that rank for broad terms.
    ...categories.map((c) => ({
      url: `${base}/listings?category=${c.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    // lastModified lets Google recrawl a changed price without refetching
    // the whole catalogue.
    ...listings.map((l) => ({
      url: `${base}/listings/${l.slug}`,
      lastModified: l.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
