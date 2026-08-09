import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listing-card";
import { getTopDealListings } from "@/lib/listings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const topDeals = await getTopDealListings(8);

  return (
    <div className="flex flex-1 flex-col">
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

      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-heading font-semibold">Today&apos;s best deals</h2>
          <Button variant="ghost" render={<Link href="/listings?sort=deal-score-desc" />}>
            View all
          </Button>
        </div>

        {topDeals.length === 0 ? (
          <p className="text-muted-foreground">
            The catalog is being stocked — check back shortly.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {topDeals.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
