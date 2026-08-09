import Image from "next/image";
import Link from "next/link";

import { DealScoreBadge } from "@/components/deal-score-badge";
import { formatCents, formatCondition } from "@/lib/format";

export interface ListingCardData {
  slug: string;
  title: string;
  priceCents: number;
  retailPriceCents: number | null;
  condition: string;
  dealScore: number;
  category: { name: string };
  photos: { url: string; altText: string | null }[];
}

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const photo = listing.photos[0];

  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
        {photo ? (
          <Image
            src={photo.url}
            alt={photo.altText ?? listing.title}
            fill
            sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
        <DealScoreBadge score={listing.dealScore} size="sm" className="absolute left-2 top-2" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
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
    </Link>
  );
}
