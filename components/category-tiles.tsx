import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { collectCategoryIds, type CategoryNode } from "@/lib/listings";
import { getDictionary } from "@/lib/i18n";

/**
 * Departments, built from what's actually in stock.
 *
 * Previously four hard-coded tiles, which meant the homepage advertised
 * Electronics long after it had emptied and hid Baby & Kids, Beauty and Tools
 * entirely. Now every top-level category holding stock gets a tile, ordered by
 * how much it holds, with a real product photo behind it — a shelf of real
 * goods reads better than a wall of icons, and it can't drift out of date.
 */

// The four departments with translated copy; anything else uses its own name.
const LABEL_KEYS: Record<string, "pet" | "home" | "mobility" | "electronics"> = {
  pets: "pet",
  "home-kitchen": "home",
  mobility: "mobility",
  electronics: "electronics",
};

// Fallback backdrop when a department has no photographed stock yet.
const BACKDROPS = [
  "bg-linear-to-br from-gold-600 to-gold-400",
  "bg-linear-to-br from-navy-800 to-navy-600",
  "bg-linear-to-br from-navy-700 to-gold-600",
  "bg-linear-to-br from-navy-900 to-navy-700",
  "bg-linear-to-br from-[#5b8c5a] to-[#2f6f6b]",
  "bg-linear-to-br from-[#8c4a2f] to-gold-600",
];

export async function CategoryTiles() {
  const dict = await getDictionary();

  const [tree, listings] = await Promise.all([
    prisma.category.findMany({
      select: { id: true, slug: true, name: true, parentId: true, sortOrder: true },
    }) as Promise<CategoryNode[]>,
    prisma.listing.findMany({
      where: { status: "PUBLISHED" },
      select: {
        categoryId: true,
        photos: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      },
    }),
  ]);

  const departments = tree
    .filter((c) => c.parentId === null)
    .map((dept) => {
      const ids = new Set(collectCategoryIds(tree, dept.slug));
      const inDept = listings.filter((l) => ids.has(l.categoryId));
      return {
        slug: dept.slug,
        name: dept.name,
        count: inDept.length,
        photoUrl: inDept.find((l) => l.photos[0]?.url)?.photos[0]?.url ?? null,
      };
    })
    // An empty department is a dead end for a shopper, so it doesn't get a tile.
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);

  if (departments.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-12">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-2xl font-heading font-semibold">{dict.categories.shopByCategory}</h2>
        <Link href="/listings" className="text-sm font-medium text-navy-800 hover:underline">
          {dict.home.viewAll}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {departments.map((dept, i) => {
          const labelKey = LABEL_KEYS[dept.slug];
          const label = labelKey ? dict.categories[labelKey] : dept.name;

          return (
            <Link
              key={dept.slug}
              href={`/listings?category=${dept.slug}`}
              className="group relative flex h-32 items-end overflow-hidden rounded-xl text-white sm:h-40"
            >
              {dept.photoUrl ? (
                <>
                  <Image
                    src={dept.photoUrl}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Gradient rather than a flat wash, so the photo still reads
                      at the top while the text stays legible at the bottom. */}
                  <div className="absolute inset-0 bg-linear-to-t from-navy-950/85 via-navy-950/40 to-navy-950/10" />
                </>
              ) : (
                <div className={`absolute inset-0 ${BACKDROPS[i % BACKDROPS.length]}`} />
              )}

              <div className="relative z-10 flex w-full items-end justify-between gap-2 p-4">
                <div className="min-w-0">
                  <p className="truncate font-heading text-lg font-semibold sm:text-xl">{label}</p>
                  <p className="mt-0.5 text-xs text-white/80">
                    {dict.browse.resultsFound.replace("{count}", String(dept.count))}
                  </p>
                </div>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20 transition-colors group-hover:bg-white/35">
                  <ArrowRight className="size-4" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
