"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { formatCents, formatCondition } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { BuyNowButton } from "@/app/listings/[slug]/buy-now-button";
import { cn } from "@/lib/utils";

export interface HeroBannerSlide {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  retailPriceCents: number | null;
  condition: string;
  inStock: boolean;
  category: { name: string };
  photos: { url: string; altText: string | null }[];
}

const SLIDE_DURATION_MS = 6000;

export function HeroBanner({ slides }: { slides: HeroBannerSlide[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % slides.length),
      SLIDE_DURATION_MS
    );
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const go = (delta: number) =>
    setIndex((current) => (current + delta + slides.length) % slides.length);

  return (
    <section className="relative overflow-hidden border-b bg-navy-900 text-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {slides.map((slide) => {
              const photo = slide.photos[0];
              return (
                <div
                  key={slide.id}
                  className="grid w-full shrink-0 items-center gap-6 py-10 md:grid-cols-2 md:py-14"
                >
                  <div className="flex flex-col items-start gap-3">
                    <p className="text-xs font-medium uppercase tracking-widest text-gold-400">
                      Just listed &middot; {slide.category.name} &middot;{" "}
                      {formatCondition(slide.condition)}
                    </p>
                    <h2 className="max-w-lg text-3xl font-heading font-semibold leading-tight sm:text-4xl">
                      {slide.title}
                    </h2>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-semibold">
                        {formatCents(slide.priceCents)}
                      </span>
                      {slide.retailPriceCents &&
                      slide.retailPriceCents > slide.priceCents ? (
                        <span className="text-lg text-white/50 line-through">
                          {formatCents(slide.retailPriceCents)}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex w-full max-w-xs gap-3">
                      <BuyNowButton listingId={slide.id} inStock={slide.inStock} />
                      <Button
                        variant="outline"
                        className="flex-1 border-white/30 text-white hover:bg-white/10"
                        render={<Link href={`/listings/${slide.slug}`} />}
                      >
                        View details
                      </Button>
                    </div>
                  </div>

                  <Link
                    href={`/listings/${slide.slug}`}
                    className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-navy-800"
                  >
                    {photo ? (
                      <Image
                        src={photo.url}
                        alt={photo.altText ?? slide.title}
                        fill
                        priority
                        sizes="(min-width: 768px) 50vw, 100vw"
                        className="object-cover"
                      />
                    ) : null}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous listing"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next listing"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <ChevronRight className="size-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Go to listing ${i + 1}`}
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
