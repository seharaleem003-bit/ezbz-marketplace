import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireCatalogAccess } from "@/lib/auth/dal";
import { PriceForm } from "./price-form";

export const metadata: Metadata = { title: "Amazon prices" };
export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export default async function AmazonPricesPage() {
  await requireCatalogAccess();

  const listings = await prisma.listing.findMany({
    where: { status: { in: ["PUBLISHED", "DRAFT"] } },
    // Missing prices first — that's the work to be done.
    orderBy: [{ amazonPriceCents: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      priceCents: true,
      amazonPriceCents: true,
      amazonUrl: true,
      amazonPriceCheckedAt: true,
      photos: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
    },
  });

  const missing = listings.filter((l) => !l.amazonPriceCents).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Amazon prices</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Open each Amazon link, read the current price, type it in. Every price you save
            switches on that listing&apos;s &ldquo;% off vs Amazon&rdquo; badge and recalculates
            its Deal Score.
          </p>
        </div>
        <Link href="/admin/listings" className="text-sm text-navy-800 hover:underline">
          Back to listings
        </Link>
      </div>

      {missing > 0 ? (
        <p className="rounded-lg bg-gold-500/15 px-4 py-2 text-sm">
          <strong>{missing}</strong> listing{missing === 1 ? "" : "s"} still{" "}
          {missing === 1 ? "has" : "have"} no Amazon price — shown first.
        </p>
      ) : (
        <p className="rounded-lg bg-green-600/10 px-4 py-2 text-sm text-green-800">
          Every listing has an Amazon price.
        </p>
      )}

      <PriceForm
        rows={listings.map((l) => ({
          id: l.id,
          title: l.title,
          photoUrl: l.photos[0]?.url ?? null,
          priceCents: l.priceCents,
          amazonPriceCents: l.amazonPriceCents,
          amazonUrl: l.amazonUrl,
          checkedAt: l.amazonPriceCheckedAt ? fmt.format(l.amazonPriceCheckedAt) : null,
        }))}
      />
    </div>
  );
}
