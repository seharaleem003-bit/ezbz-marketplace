"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

import { formatCents, formatCondition } from "@/lib/format";
import { DiscountBadge, calculateDiscount } from "@/components/discount-badge";
import { Button } from "@/components/ui/button";
import { BuyNowButton } from "@/app/listings/[slug]/buy-now-button";
import { cn } from "@/lib/utils";

export interface HeroBannerSlide {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  retailPriceCents: number | null;
  amazonPriceCents: number | null;
  condition: string;
  inStock: boolean;
  category: { name: string };
  photos: { url: string; altText: string | null }[];
}

/** A non-listing marketing slide mixed into the same carousel. */
export interface HeroPromoSlide {
  id: string;
  kicker: string;
  headline: string;
  blurb: string;
  ctaLabel: string;
  ctaHref: string;
  photoUrl: string | null;
}

export interface HeroBannerLabels {
  justListed: string;
  buyNow: string;
  viewDetails: string;
  outOfStock: string;
  photoComingSoon: string;
  previous: string;
  next: string;
  off: string;
  vsAmazon: string;
  offRetail: string;
}

const SLIDE_DURATION_MS = 7000;
const LISTINGS_PER_SLIDE = 3;

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}

/** One listing within a 3-up hero group. */
function HeroCard({
  slide,
  labels,
}: {
  slide: HeroBannerSlide;
  labels: HeroBannerLabels;
}) {
  const photo = slide.photos[0];
  const discount = calculateDiscount({
    priceCents: slide.priceCents,
    amazonPriceCents: slide.amazonPriceCents,
    retailPriceCents: slide.retailPriceCents,
  });

  return (
    <div className="group/card flex flex-col overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10 transition-colors hover:bg-white/10">
      <Link
        href={`/listings/${slide.slug}`}
        className="relative aspect-4/3 w-full overflow-hidden bg-navy-800"
      >
        {photo ? (
          <Image
            src={photo.url}
            alt={photo.altText ?? slide.title}
            fill
            priority
            sizes="(min-width: 768px) 33vw, 90vw"
            className="object-cover transition-transform duration-500 group-hover/card:scale-105"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-white/40">
            <ImageOff className="size-7" />
            <span className="text-xs">{labels.photoComingSoon}</span>
          </div>
        )}

        {discount ? (
          <DiscountBadge
            discount={discount}
            size="sm"
            className="absolute left-2 top-2"
            labels={{
              off: labels.off,
              vsAmazon: labels.vsAmazon,
              offRetail: labels.offRetail,
            }}
          />
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[11px] font-medium uppercase tracking-widest text-gold-400">
          {slide.category.name} &middot; {formatCondition(slide.condition)}
        </p>

        <Link
          href={`/listings/${slide.slug}`}
          className="line-clamp-2 font-heading text-base font-semibold leading-snug hover:underline"
        >
          {slide.title}
        </Link>

        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="text-xl font-semibold">{formatCents(slide.priceCents)}</span>
          {slide.retailPriceCents && slide.retailPriceCents > slide.priceCents ? (
            <span className="text-sm text-white/50 line-through">
              {formatCents(slide.retailPriceCents)}
            </span>
          ) : null}
        </div>

        <div className="mt-1 flex gap-2">
          <BuyNowButton
            listingId={slide.id}
            inStock={slide.inStock}
            labels={{ buyNow: labels.buyNow, outOfStock: labels.outOfStock }}
          />
          <Button
            variant="outline"
            size="sm"
            className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            render={<Link href={`/listings/${slide.slug}`} />}
          >
            {labels.viewDetails}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function HeroBanner({
  slides,
  promo,
  labels,
}: {
  slides: HeroBannerSlide[];
  /** Rendered as the first slide when present. */
  promo?: HeroPromoSlide | null;
  labels: HeroBannerLabels;
}) {
  const [index, setIndex] = useState(0);

  // Listings are shown three at a time; each carousel step swaps in the next
  // group rather than the next single item.
  const groups = chunk(slides, LISTINGS_PER_SLIDE);
  const totalSlides = groups.length + (promo ? 1 : 0);

  useEffect(() => {
    if (totalSlides <= 1) return;
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % totalSlides),
      SLIDE_DURATION_MS
    );
    return () => clearInterval(timer);
  }, [totalSlides]);

  if (totalSlides === 0) return null;

  const go = (delta: number) =>
    setIndex((current) => (current + delta + totalSlides) % totalSlides);

  return (
    <section className="relative overflow-hidden border-b bg-navy-900 text-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {promo ? (
              <div
                key={promo.id}
                className="grid w-full shrink-0 items-center gap-6 py-10 md:grid-cols-2 md:py-14"
              >
                <div className="flex flex-col items-start gap-3">
                  <p className="rounded-full bg-gold-500 px-3 py-1 text-xs font-bold uppercase tracking-widest text-navy-900">
                    {promo.kicker}
                  </p>
                  <h2 className="max-w-lg text-3xl font-heading font-semibold leading-tight sm:text-4xl">
                    {promo.headline}
                  </h2>
                  <p className="max-w-md text-white/70">{promo.blurb}</p>
                  <Button
                    size="lg"
                    className="mt-2 bg-gold-500 text-navy-900 hover:bg-gold-400"
                    render={<Link href={promo.ctaHref} />}
                  >
                    {promo.ctaLabel}
                  </Button>
                </div>

                <Link
                  href={promo.ctaHref}
                  className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-navy-800"
                >
                  {promo.photoUrl ? (
                    <Image
                      src={promo.photoUrl}
                      alt=""
                      fill
                      priority
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                    />
                  ) : null}
                </Link>
              </div>
            ) : null}

            {groups.map((group, groupIndex) => (
              <div key={`group-${groupIndex}`} className="w-full shrink-0 py-10 md:py-12">
                <p className="mb-4 text-xs font-medium uppercase tracking-widest text-gold-400">
                  {labels.justListed}
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.map((slide) => (
                    <HeroCard key={slide.id} slide={slide} labels={labels} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {totalSlides > 1 ? (
        <>
          <button
            type="button"
            aria-label={labels.previous}
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label={labels.next}
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <ChevronRight className="size-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {Array.from({ length: totalSlides }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-6 bg-gold-400" : "w-1.5 bg-white/40"
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
