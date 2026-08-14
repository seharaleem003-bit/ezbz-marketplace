import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CategoryTiles } from "@/components/category-tiles";
import { HeroTilesRow } from "@/components/hero-tiles-row";
import { ListingCard } from "@/components/listing-card";
import { getPrebookListings, getTopDealListings } from "@/lib/listings";
import { getHeroTiles } from "@/lib/hero-tiles";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [topDeals, prebook, heroTiles, dict] = await Promise.all([
    getTopDealListings(12),
    getPrebookListings(4),
    getHeroTiles(),
    getDictionary(),
  ]);

  // Pre-book items have their own row, so they're kept out of the deals grid.
  const prebookIds = new Set(prebook.map((listing) => listing.id));
  const remainingDeals = topDeals.filter((listing) => !prebookIds.has(listing.id));

  return (
    <div className="flex flex-1 flex-col">
      <HeroTilesRow
        tiles={heroTiles}
        labels={{ previous: dict.home.previousListing, next: dict.home.nextListing }}
      />

      <CategoryTiles />

      {prebook.length > 0 ? (
        <section className="mx-auto w-full max-w-6xl px-4 pt-12">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-2xl font-heading font-semibold">
                {dict.home.prebookSection}
              </h2>
              <p className="text-sm text-muted-foreground">
                {dict.home.prebookSectionBlurb}
              </p>
            </div>
            <Button variant="ghost" render={<Link href="/listings?prebook=1" />}>
              {dict.home.viewAll}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {prebook.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-heading font-semibold">{dict.home.todaysBestDeals}</h2>
          <Button variant="ghost" render={<Link href="/listings?sort=deal-score-desc" />}>
            {dict.home.viewAll}
          </Button>
        </div>

        {remainingDeals.length === 0 ? (
          <p className="text-muted-foreground">{dict.home.emptyCatalog}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {remainingDeals.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
