"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { HeroTile } from "@/lib/hero-tiles";
import { cn } from "@/lib/utils";

const ROTATE_MS = 6000;

/**
 * The imagery block inside a tile. One photo fills the space; several are
 * arranged in a 2x2 grid the way a category collage reads on Amazon.
 */
function TileImages({ urls, alt }: { urls: string[]; alt: string }) {
  if (urls.length === 0) return null;

  // White panels, not a translucent tint over the tile colour: these are
  // catalogue shots on white backgrounds, so a gold or lime wash behind them
  // leaves the product sitting in a dirty halo. Padding keeps the product off
  // the panel edge, and object-contain shows all of it — cropping a product
  // photo to fill a square is what cut the tops off lamps and bowls.
  if (urls.length === 1) {
    return (
      <div className="relative mt-3 aspect-4/3 w-full overflow-hidden rounded-lg bg-white">
        <Image
          src={urls[0]}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 90vw"
          className="object-contain p-2 transition-transform duration-500 group-hover/tile:scale-105"
        />
      </div>
    );
  }

  return (
    <div className="mt-3 grid aspect-4/3 w-full grid-cols-2 gap-1.5">
      {urls.slice(0, 4).map((url, i) => (
        <div key={i} className="relative overflow-hidden rounded-md bg-white">
          <Image
            src={url}
            alt=""
            fill
            sizes="(min-width: 1024px) 12vw, 45vw"
            className="object-contain p-1.5 transition-transform duration-500 group-hover/tile:scale-105"
          />
        </div>
      ))}
    </div>
  );
}

function Tile({ tile }: { tile: HeroTile }) {
  return (
    <Link
      href={tile.href}
      className={cn(
        "group/tile flex min-w-0 flex-col rounded-xl p-5 shadow-sm transition-shadow hover:shadow-lg",
        tile.background,
        tile.text
      )}
    >
      <p className="text-sm font-medium opacity-80">{tile.kicker}</p>
      <h3 className="mt-1 font-heading text-2xl font-bold leading-tight">{tile.headline}</h3>
      {tile.sub ? <p className="mt-1 text-sm font-medium opacity-80">{tile.sub}</p> : null}

      <div className="relative">
        <TileImages urls={tile.imageUrls} alt={tile.headline} />
        {tile.price ? (
          <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-3 py-1 text-sm font-bold text-navy-900 shadow-sm">
            {tile.price}
          </span>
        ) : null}
      </div>

      <span className="mt-4 text-sm font-semibold underline underline-offset-4">
        {tile.ctaLabel}
      </span>
    </Link>
  );
}

export function HeroTilesRow({
  tiles,
  labels,
}: {
  tiles: HeroTile[];
  labels: { previous: string; next: string };
}) {
  // How many tiles sit in the row at once — matched to the grid breakpoints
  // below so a "page" of the carousel is exactly one screenful.
  const [perView, setPerView] = useState(4);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      setPerView(w >= 1024 ? 4 : w >= 640 ? 2 : 1);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  // Only show whole rows. A trailing partial page leaves dead white space
  // beside one or two stranded tiles, which reads as broken — better to hold
  // the odd tile back until there are enough to fill another row.
  const usable =
    tiles.length >= perView
      ? tiles.slice(0, Math.floor(tiles.length / perView) * perView)
      : tiles;

  const pageCount = Math.max(1, Math.ceil(usable.length / perView));

  // Clamp when the viewport shrinks and there are fewer pages than before.
  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  useEffect(() => {
    if (pageCount <= 1) return;
    const timer = setInterval(() => setPage((p) => (p + 1) % pageCount), ROTATE_MS);
    return () => clearInterval(timer);
  }, [pageCount]);

  if (tiles.length === 0) return null;

  const go = (delta: number) => setPage((p) => (p + delta + pageCount) % pageCount);

  return (
    <section className="relative border-b bg-muted/40 py-6">
      <div className="mx-auto max-w-6xl px-4">
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            // Promoting the track to its own layer keeps the slide animation
            // from repainting (and smearing) the sticky header above it.
            style={{ transform: `translateX(-${page * 100}%)`, willChange: "transform" }}
          >
            {Array.from({ length: pageCount }, (_, pageIndex) => (
              <div
                key={pageIndex}
                className={cn(
                  "grid w-full shrink-0 gap-4",
                  perView === 4
                    ? "grid-cols-4"
                    : perView === 2
                      ? "grid-cols-2"
                      : "grid-cols-1"
                )}
              >
                {usable
                  .slice(pageIndex * perView, pageIndex * perView + perView)
                  .map((tile) => (
                    <Tile key={tile.id} tile={tile} />
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {pageCount > 1 ? (
        <>
          <button
            type="button"
            aria-label={labels.previous}
            onClick={() => go(-1)}
            className="absolute left-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background shadow-md ring-1 ring-foreground/10 hover:bg-muted"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label={labels.next}
            onClick={() => go(1)}
            className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background shadow-md ring-1 ring-foreground/10 hover:bg-muted"
          >
            <ChevronRight className="size-5" />
          </button>

          <div className="mt-4 flex justify-center gap-2">
            {Array.from({ length: pageCount }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === page}
                onClick={() => setPage(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === page ? "w-6 bg-navy-800" : "w-1.5 bg-foreground/25"
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
