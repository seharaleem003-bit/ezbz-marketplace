import Link from "next/link";

import { Button } from "@/components/ui/button";
import { HeroBanner } from "@/components/hero-banner";
import { ListingCard } from "@/components/listing-card";
import { getNewestListings, getTopDealListings } from "@/lib/listings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [newest, topDeals] = await Promise.all([
    getNewestListings(3),
    getTopDealListings(12),
  ]);

  const bannerIds = new Set(newest.map((listing) => listing.id));
  const remainingDeals = topDeals.filter((listing) => !bannerIds.has(listing.id));

  return (
    <div className="flex flex-1 flex-col">
      {newest.length > 0 ? (
        <HeroBanner
          slides={newest.map((listing) => ({
            id: listing.id,
            slug: listing.slug,
            title: listing.title,
            priceCents: listing.priceCents,
            retailPriceCents: listing.retailPriceCents,
            condition: listing.condition,
            inStock: listing.inventoryQty > 0,
            category: { name: listing.category.name },
            photos: listing.photos.map((photo) => ({
              url: photo.url,
              altText: photo.altText,
            })),
          }))}
        />
      ) : (
        <section className="border-b bg-navy-900 text-white">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-20">
            <p className="text-sm font-medium uppercase tracking-widest text-gold-400">
              Liquidation & auction deals
            </p>
            <h1 className="max-w-xl text-4xl font-heading font-semibold leading-tight sm:text-5xl">
              Real deals, verified by Deal Score&trade;.
            </h1>
            <p className="max-w-lg text-white/70">
              Browse liquidation and auction inventory with an at-a-glance score for how good
              the deal really is — plus Amazon price comparisons and video walkarounds so you
              know exactly what you&apos;re buying.
            </p>
            <Button
              size="lg"
              className="mt-2 bg-gold-500 text-navy-900 hover:bg-gold-400"
              render={<Link href="/listings" />}
            >
              Browse deals
            </Button>
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-heading font-semibold">Today&apos;s best deals</h2>
          <Button variant="ghost" render={<Link href="/listings?sort=deal-score-desc" />}>
            View all
          </Button>
        </div>

        {remainingDeals.length === 0 ? (
          <p className="text-muted-foreground">
            The catalog is being stocked — check back shortly.
          </p>
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
