import Link from "next/link";
import type { Metadata } from "next";

import { getListings, type ListingSearchParams } from "@/lib/listings";
import { ListingCard } from "@/components/listing-card";
import { ListingFilters } from "@/components/listing-filters";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Browse deals",
};

export const dynamic = "force-dynamic";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}) {
  const params = await searchParams;
  const { listings, total, page, pageCount, categories } = await getListings(params);

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
        <h1 className="text-2xl font-heading font-semibold">Browse deals</h1>
        <p className="text-sm text-muted-foreground">
          {total} listing{total === 1 ? "" : "s"} found
        </p>
      </div>

      <ListingFilters categories={categories} />

      {listings.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          No listings match those filters yet. Try broadening your search.
        </p>
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
              Previous
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Button variant="outline" size="sm" render={<Link href={pageHref(page + 1)} />}>
              Next
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
