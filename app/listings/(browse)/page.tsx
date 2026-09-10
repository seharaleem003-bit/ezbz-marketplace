import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";

import { getListings, type ListingSearchParams } from "@/lib/listings";
import { ListingCard } from "@/components/listing-card";
import { ListingFilters } from "@/components/listing-filters";
import { Button } from "@/components/ui/button";
import { getDictionary, getLocale, t } from "@/lib/i18n";
import { categoryName } from "@/lib/i18n/content";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.browse };
}

export const dynamic = "force-dynamic";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}) {
  const params = await searchParams;
  const dict = await getDictionary();
  const locale = await getLocale();
  const {
    listings,
    total,
    page,
    pageCount,
    categories,
    selectedCategory,
    subcategories,
    breadcrumb,
    didYouMean,
  } = await getListings(params);

  /** Keeps the current filters while swapping the category. */
  function categoryHref(slug: string | null) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "page" && key !== "category") next.set(key, value);
    }
    if (slug) next.set("category", slug);
    const qs = next.toString();
    return qs ? `/listings?${qs}` : "/listings";
  }

  const baseParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") baseParams.set(key, value);
  }

  function pageHref(targetPage: number) {
    const next = new URLSearchParams(baseParams);
    if (targetPage > 1) next.set("page", String(targetPage));
    const qs = next.toString();
    return qs ? `/listings?${qs}` : "/listings";
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <div>
        {breadcrumb.length > 0 ? (
          <nav aria-label="Category" className="mb-1 flex flex-wrap items-center gap-1 text-sm">
            <Link href={categoryHref(null)} className="text-muted-foreground hover:underline">
              {dict.browse.allCategories}
            </Link>
            {breadcrumb.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1">
                <ChevronRight className="size-3.5 text-muted-foreground" />
                {i === breadcrumb.length - 1 ? (
                  <span className="font-medium">{categoryName(crumb, locale)}</span>
                ) : (
                  <Link
                    href={categoryHref(crumb.slug)}
                    className="text-muted-foreground hover:underline"
                  >
                    {categoryName(crumb, locale)}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        ) : null}

        <h1 className="text-2xl font-heading font-semibold">
          {selectedCategory ? categoryName(selectedCategory, locale) : dict.browse.title}
        </h1>
        {/* Counted only for a search, where the number answers "did that find
            anything?". Browsing a category, it just advertises how small the
            department is, which is nobody's reason for being there. */}
        {params.q?.trim() ? (
          <p className="text-sm text-muted-foreground">
            {t(dict.browse.resultsFound, { count: total })}
          </p>
        ) : null}
        {/* Says plainly that the spelling didn't match, rather than silently
            showing results for something the shopper didn't type. */}
        {didYouMean ? (
          <p className="mt-1 text-sm text-muted-foreground">
            No exact match for <span className="font-medium">&ldquo;{didYouMean}&rdquo;</span> —
            showing the closest products.
          </p>
        ) : null}
      </div>

      {/* Drill-down: children of the current category, or the top level when
          nothing is selected. */}
      {subcategories.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {subcategories.map((sub) => (
            <Link
              key={sub.id}
              href={categoryHref(sub.slug)}
              className="rounded-full border px-3 py-1.5 text-sm font-medium transition-colors hover:border-gold-500 hover:bg-gold-500/10"
            >
              {categoryName(sub, locale)}
            </Link>
          ))}
        </div>
      ) : null}

      <ListingFilters categories={categories} />

      {listings.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">{dict.browse.noResults}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      {pageCount > 1 ? (
        <div className="flex items-center justify-center gap-3 pt-4">
          {page > 1 ? (
            <Button variant="outline" size="sm" render={<Link href={pageHref(page - 1)} />}>
              {dict.browse.previous}
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              {dict.browse.previous}
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            {t(dict.browse.pageOf, { page, pageCount })}
          </span>
          {page < pageCount ? (
            <Button variant="outline" size="sm" render={<Link href={pageHref(page + 1)} />}>
              {dict.browse.next}
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              {dict.browse.next}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
