import Image from "next/image";
import Link from "next/link";

import { formatCents } from "@/lib/format";
import { DiscountBadge, calculateDiscount } from "@/components/discount-badge";
import type { RecommendedListing } from "@/lib/recommendations";

/**
 * Horizontal shelf of recommended products.
 *
 * Scrolls rather than wraps, so a long list never pushes the rest of the page
 * down on mobile.
 */
export function RecommendationRow({
  heading,
  subheading,
  items,
  labels,
}: {
  heading: string;
  subheading?: string;
  items: RecommendedListing[];
  labels: { off: string; vsAmazon: string; offRetail: string; outOfStock: string };
}) {
  if (items.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-heading text-xl font-semibold">{heading}</h2>
      {subheading ? (
        <p className="mt-0.5 text-sm text-muted-foreground">{subheading}</p>
      ) : null}

      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
        {items.map((item) => {
          const discount = calculateDiscount({
            priceCents: item.priceCents,
            amazonPriceCents: item.amazonPriceCents,
            retailPriceCents: item.retailPriceCents,
          });
          const soldOut = !item.isPrebook && item.inventoryQty <= 0;

          return (
            <Link
              key={item.id}
              href={`/listings/${item.slug}`}
              className="group/rec w-44 shrink-0"
            >
              <div className="relative aspect-square overflow-hidden rounded-lg bg-white ring-1 ring-foreground/5">
                {item.photoUrl ? (
                  <Image
                    src={item.photoUrl}
                    alt={item.title}
                    fill
                    sizes="176px"
                    className="object-contain transition-transform duration-300 group-hover/rec:scale-105"
                  />
                ) : null}
                {soldOut ? (
                  <span className="absolute inset-x-0 bottom-0 bg-navy-900/85 py-1 text-center text-xs font-semibold text-white">
                    {labels.outOfStock}
                  </span>
                ) : null}
              </div>

              <p className="mt-2 line-clamp-2 text-sm leading-snug group-hover/rec:underline">
                {item.title}
              </p>

              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="font-semibold">{formatCents(item.priceCents)}</span>
                {discount ? (
                  <DiscountBadge
                    discount={discount}
                    labels={{
                      off: labels.off,
                      vsAmazon: labels.vsAmazon,
                      offRetail: labels.offRetail,
                    }}
                  />
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
