"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface GalleryPhoto {
  id: string;
  url: string;
  altText: string | null;
}

/**
 * Product photo gallery: swipe on touch, arrows on desktop, thumbnails under.
 *
 * The ribbon is passed in rather than rendered here so it stays overlaid on the
 * active image without the gallery needing to know what a ribbon is.
 */
export function ListingGallery({
  photos,
  title,
  ribbon,
  labels,
}: {
  photos: GalleryPhoto[];
  title: string;
  ribbon?: ReactNode;
  labels: { previous: string; next: string };
}) {
  const [index, setIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-muted">{ribbon}</div>
    );
  }

  const count = photos.length;
  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  // A short horizontal drag counts as a swipe; anything less is a tap.
  const onTouchEnd = (endX: number) => {
    if (touchStartX === null) return;
    const dx = endX - touchStartX;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    setTouchStartX(null);
  };

  const active = photos[index];

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative aspect-4/3 select-none overflow-hidden rounded-xl bg-muted"
        onTouchStart={(e) => setTouchStartX(e.changedTouches[0].clientX)}
        onTouchEnd={(e) => onTouchEnd(e.changedTouches[0].clientX)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
        }}
        tabIndex={count > 1 ? 0 : -1}
        role={count > 1 ? "group" : undefined}
        aria-label={count > 1 ? `${title} — image ${index + 1} of ${count}` : undefined}
      >
        <Image
          key={active.id}
          src={active.url}
          alt={active.altText ?? title}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />

        {ribbon}

        {count > 1 ? (
          <>
            <button
              type="button"
              aria-label={labels.previous}
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-md ring-1 ring-foreground/10 transition hover:bg-background"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label={labels.next}
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-md ring-1 ring-foreground/10 transition hover:bg-background"
            >
              <ChevronRight className="size-5" />
            </button>

            <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-background/80 px-2 py-1">
              {photos.map((photo, i) => (
                <span
                  key={photo.id}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-4 bg-navy-800" : "w-1.5 bg-foreground/30"
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === index}
              className={`relative aspect-square overflow-hidden rounded-lg bg-muted ring-2 transition ${
                i === index ? "ring-navy-800" : "ring-transparent hover:ring-foreground/20"
              }`}
            >
              <Image
                src={photo.url}
                alt=""
                fill
                sizes="(min-width: 1024px) 12vw, 22vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
