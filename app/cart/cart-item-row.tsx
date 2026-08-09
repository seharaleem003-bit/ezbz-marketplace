"use client";

import { useTransition } from "react";
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
    photos: { url: string; altText: string | null }[];
  };
}

export function CartItemRow({ item }: { item: CartItemData }) {
  const [isPending, startTransition] = useTransition();
  const photo = item.listing.photos[0];
  const priceChanged = item.priceCentsAtAdd !== item.listing.priceCents;

  function updateQuantity(nextQuantity: number) {
    startTransition(async () => {
      await updateCartItemQuantityAction(item.id, nextQuantity);
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
        className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted"
      >
        {photo ? (
          <Image
            src={photo.url}
            alt={photo.altText ?? item.listing.title}
            fill
            sizes="80px"
            className="object-cover"
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
          disabled={isPending}
          onClick={() => updateQuantity(item.quantity + 1)}
          aria-label="Increase quantity"
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
