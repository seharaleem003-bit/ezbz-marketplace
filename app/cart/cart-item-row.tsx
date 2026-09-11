"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";

import { updateCartItemQuantityAction, removeCartItemAction } from "./actions";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/format";

export interface CartItemData {
  id: string;
  quantity: number;
  priceCentsAtAdd: number;
  listing: {
    slug: string;
    title: string;
    priceCents: number;
    inventoryQty: number;
    isPrebook: boolean;
    photos: { url: string; altText: string | null }[];
  };
}

export function CartItemRow({ item }: { item: CartItemData }) {
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const photo = item.listing.photos[0];
  const priceChanged = item.priceCentsAtAdd !== item.listing.priceCents;

  // A pre-book is sold before it exists, so its stock count is not a limit.
  const cap = item.listing.isPrebook ? null : item.listing.inventoryQty;
  const atMax = cap !== null && item.quantity >= cap;

  function updateQuantity(nextQuantity: number) {
    setNotice(null);
    startTransition(async () => {
      const result = await updateCartItemQuantityAction(item.id, nextQuantity);
      if (result?.error) setNotice(result.error);
      else if (result?.cappedTo !== undefined) setNotice(`Only ${result.cappedTo} in stock.`);
    });
  }

  function remove() {
    startTransition(async () => {
      await removeCartItemAction(item.id);
    });
  }

  return (
    <div className="flex items-center gap-4 border-b py-4 last:border-b-0">
      <Link
        href={`/listings/${item.listing.slug}`}
        className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-foreground/10"
      >
        {photo ? (
          <Image
            src={photo.url}
            alt={photo.altText ?? item.listing.title}
            fill
            sizes="80px"
            className="object-contain"
          />
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-1">
        <Link href={`/listings/${item.listing.slug}`} className="text-sm font-medium">
          {item.listing.title}
        </Link>
        <span className="text-sm text-muted-foreground">
          {formatCents(item.listing.priceCents)} each
        </span>
        {priceChanged ? (
          <span className="text-xs text-muted-foreground">
            Price updated since you added this item
          </span>
        ) : null}
        {/* Says why the quantity stopped where it did, rather than letting the
            + button just go dead with no explanation. */}
        {notice ? (
          <span role="status" className="text-xs font-medium text-destructive">
            {notice}
          </span>
        ) : atMax ? (
          <span className="text-xs text-muted-foreground">
            {cap} in stock — that&apos;s the maximum
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={isPending}
          onClick={() => updateQuantity(item.quantity - 1)}
          aria-label="Decrease quantity"
        >
          <Minus />
        </Button>
        <span className="w-8 text-center text-sm">{item.quantity}</span>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={isPending || atMax}
          onClick={() => updateQuantity(item.quantity + 1)}
          aria-label="Increase quantity"
          title={atMax ? `Only ${cap} in stock` : undefined}
        >
          <Plus />
        </Button>
      </div>

      <span className="w-20 text-right text-sm font-medium">
        {formatCents(item.listing.priceCents * item.quantity)}
      </span>

      <Button
        variant="ghost"
        size="icon-sm"
        disabled={isPending}
        onClick={remove}
        aria-label="Remove item"
      >
        <X />
      </Button>
    </div>
  );
}
