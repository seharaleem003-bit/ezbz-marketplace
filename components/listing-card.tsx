import Image from "next/image";
import Link from "next/link";
import { Share2 } from "lucide-react";

import { DiscountBadge, calculateDiscount } from "@/components/discount-badge";
import { CornerRibbon, ribbonFor } from "@/components/corner-ribbon";
import { ShareMenu } from "@/components/share-menu";
import { ListingHeartButton } from "@/components/listing-heart-button";
import { formatCents, formatCondition } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { getViewerWatchedIds } from "@/lib/watches";

export interface ListingCardData {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  retailPriceCents: number | null;
  amazonPriceCents?: number | null;
  condition: string;
  dealScore: number;
  isPrebook?: boolean;
  inventoryQty?: number;
  prebookReleaseAt?: Date | null;
  category: { name: string };
  photos: { url: string; altText: string | null }[];
}

export async function ListingCard({
  listing,
  referralCode,
}: {
  listing: ListingCardData;
  referralCode?: string | null;
}) {
  const dict = await getDictionary();
  // One query per request, not per card — see lib/watches.ts.
  const watched = await getViewerWatchedIds();
  const photo = listing.photos[0];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const listingUrl = `${appUrl}/listings/${listing.slug}`;
  const discount = calculateDiscount({
    priceCents: listing.priceCents,
    amazonPriceCents: listing.amazonPriceCents,
    retailPriceCents: listing.retailPriceCents,
  });
  const ribbon = ribbonFor(listing);

  return (
    // The share control can't live inside the card's <Link> (nested
    // interactive elements), so the wrapper is a plain div and the link
    // covers the card via an inset overlay.
    <div className="group relative flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:shadow-lg">
      <div className="relative aspect-4/3 w-full overflow-hidden bg-white">
        {photo ? (
          <Image
            src={photo.url}
            alt={photo.altText ?? listing.title}
            fill
            sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 90vw"
            className="object-contain transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
        {ribbon ? (
          <CornerRibbon
            kind={ribbon}
            label={ribbon === "sold" ? dict.listing.ribbonSold : dict.listing.ribbonPrebook}
          />
        ) : null}
        {discount ? (
          <DiscountBadge
            discount={discount}
            size="sm"
            className="absolute bottom-2 left-2"
            labels={{
              off: dict.listing.off,
              vsAmazon: dict.listing.vsAmazon,
              offRetail: dict.listing.offRetail,
            }}
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {listing.isPrebook ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">
            {dict.home.prebookBadge}
            {listing.prebookReleaseAt
              ? ` · ${dict.home.releases} ${listing.prebookReleaseAt.toLocaleDateString()}`
              : ""}
          </p>
        ) : null}
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {listing.category.name} &middot; {formatCondition(listing.condition)}
        </p>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{listing.title}</h3>
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="text-lg font-semibold">{formatCents(listing.priceCents)}</span>
          {listing.retailPriceCents && listing.retailPriceCents > listing.priceCents ? (
            <span className="text-sm text-muted-foreground line-through">
              {formatCents(listing.retailPriceCents)}
            </span>
          ) : null}
        </div>
      </div>

      <Link
        href={`/listings/${listing.slug}`}
        className="absolute inset-0 z-10"
        aria-label={listing.title}
      />

      <div className="absolute right-2 top-2 z-20 flex items-center gap-1.5">
        {/* Saving from the grid, not only from the product page. Signed-out
            shoppers are sent to log in by the action itself. */}
        <ListingHeartButton
          listingId={listing.id}
          initialWatching={watched.has(listing.id)}
          iconClassName="size-4"
          className="flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur hover:bg-background"
        />
        <ShareMenu
          url={listingUrl}
          title={listing.title}
          referralCode={referralCode}
          labels={dict.share}
          trigger={
            <button
              type="button"
              aria-label={`${dict.listing.shareLabel}: ${listing.title}`}
              className="flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur transition-colors hover:bg-background"
            >
              <Share2 className="size-4" />
            </button>
          }
        />
      </div>
    </div>
  );
}
