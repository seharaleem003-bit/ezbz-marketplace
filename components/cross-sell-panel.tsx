import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { formatCents } from "@/lib/format";
import { t } from "@/lib/i18n";
import { AddOnButton } from "@/components/add-on-button";

export interface CrossSellItem {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  retailPriceCents: number | null;
  photos: { url: string; altText: string | null }[];
}

export function CrossSellPanel({
  items,
  remainingForFreeCents,
  labels,
}: {
  items: CrossSellItem[];
  remainingForFreeCents: number;
  labels: {
    heading: string;
    nudge: string;
    generic: string;
    unlocksFreeShipping: string;
    add: string;
    adding: string;
    addedToOrder: string;
  };
}) {
  if (items.length === 0) return null;

  return (
    <section className="mt-8 rounded-xl border p-4">
      <div className="mb-1 flex items-center gap-2">
        <Sparkles className="size-4 text-gold-500" />
        <h2 className="font-heading font-semibold">{labels.heading}</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        {remainingForFreeCents > 0
          ? t(labels.nudge, { amount: formatCents(remainingForFreeCents) })
          : labels.generic}
      </p>

      <ul className="flex flex-col gap-3">
        {items.map((item) => {
          const photo = item.photos[0];
          const unlocksFreeShipping =
            remainingForFreeCents > 0 && item.priceCents >= remainingForFreeCents;

          return (
            <li key={item.id} className="flex items-center gap-3">
              <Link
                href={`/listings/${item.slug}`}
                className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted"
              >
                {photo ? (
                  <Image
                    src={photo.url}
                    alt={photo.altText ?? item.title}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : null}
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/listings/${item.slug}`}
                  className="line-clamp-1 text-sm font-medium hover:underline"
                >
                  {item.title}
                </Link>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">{formatCents(item.priceCents)}</span>
                  {item.retailPriceCents && item.retailPriceCents > item.priceCents ? (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatCents(item.retailPriceCents)}
                    </span>
                  ) : null}
                </div>
                {unlocksFreeShipping ? (
                  <p className="text-xs font-medium text-gold-600">
                    {labels.unlocksFreeShipping}
                  </p>
                ) : null}
              </div>

              <AddOnButton
                listingId={item.id}
                labels={{
                  add: labels.add,
                  adding: labels.adding,
                  added: labels.addedToOrder,
                }}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
