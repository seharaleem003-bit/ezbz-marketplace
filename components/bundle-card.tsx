"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, ShoppingCart, Check } from "lucide-react";

import { addToCartAction } from "@/app/cart/actions";
import { formatCents } from "@/lib/format";
import { Button } from "@/components/ui/button";
import type { RecommendedListing } from "@/lib/recommendations";

export interface BundleMain {
  id: string;
  title: string;
  priceCents: number;
  photoUrl: string | null;
}

/**
 * "Frequently bought together" as a two-item bundle: the product being viewed
 * plus one companion, with a combined total and a single add-to-cart.
 *
 * One companion, not a shelf. A row of four loosely related products reads as
 * filler; a single deliberate pairing reads as a recommendation.
 */
export function BundleCard({
  main,
  companion,
  labels,
}: {
  main: BundleMain;
  companion: RecommendedListing;
  labels: {
    heading: string;
    subheading: string;
    thisItem: string;
    total: string;
    addBoth: string;
    added: string;
  };
}) {
  const [pending, start] = useTransition();
  const [added, setAdded] = useState(false);

  const total = main.priceCents + companion.priceCents;

  const addBoth = () =>
    start(async () => {
      // Two calls to the existing action rather than a new bundle action — the
      // cart already knows how to add a listing, and a bundle is just two adds.
      for (const id of [main.id, companion.id]) {
        const fd = new FormData();
        fd.set("listingId", id);
        fd.set("quantity", "1");
        await addToCartAction(fd);
      }
      setAdded(true);
    });

  const Tile = ({
    title,
    priceCents,
    photoUrl,
    href,
    tag,
  }: {
    title: string;
    priceCents: number;
    photoUrl: string | null;
    href?: string;
    tag?: string;
  }) => {
    const body = (
      <>
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/5">
          {photoUrl ? (
            <Image src={photoUrl} alt={title} fill sizes="160px" className="object-cover" />
          ) : null}
          {tag ? (
            <span className="absolute left-2 top-2 rounded-full bg-navy-900/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              {tag}
            </span>
          ) : null}
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-snug">{title}</p>
        <p className="mt-0.5 font-semibold">{formatCents(priceCents)}</p>
      </>
    );
    return href ? (
      <Link href={href} className="w-40 shrink-0 hover:underline">
        {body}
      </Link>
    ) : (
      <div className="w-40 shrink-0">{body}</div>
    );
  };

  return (
    <section className="mt-10 rounded-xl border bg-card p-5">
      <h2 className="font-heading text-xl font-semibold">{labels.heading}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{labels.subheading}</p>

      <div className="mt-4 flex flex-wrap items-start gap-4 sm:flex-nowrap sm:items-center">
        <Tile
          title={main.title}
          priceCents={main.priceCents}
          photoUrl={main.photoUrl}
          tag={labels.thisItem}
        />
        <Plus className="hidden size-6 shrink-0 text-muted-foreground sm:block" />
        <Tile
          title={companion.title}
          priceCents={companion.priceCents}
          photoUrl={companion.photoUrl}
          href={`/listings/${companion.slug}`}
        />

        <div className="ml-auto flex w-full flex-col gap-2 sm:w-auto sm:min-w-52">
          <p className="text-sm text-muted-foreground">{labels.total}</p>
          <p className="font-heading text-2xl font-bold">{formatCents(total)}</p>
          <Button onClick={addBoth} disabled={pending || added} className="w-full">
            {added ? <Check /> : <ShoppingCart />}
            {added ? labels.added : labels.addBoth}
          </Button>
        </div>
      </div>
    </section>
  );
}
