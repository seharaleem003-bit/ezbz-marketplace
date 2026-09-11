"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { addToCartAction } from "@/app/cart/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddToCartForm({
  listingId,
  inStock,
  /** Units available. Null for a pre-book, which is sold before it exists. */
  maxQuantity,
}: {
  listingId: string;
  inStock: boolean;
  maxQuantity?: number | null;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await addToCartAction(formData);
      // The server caps the quantity to stock; say so rather than silently
      // adding fewer than the shopper asked for.
      if (result?.error) toast.error(result.error);
      else if (result?.cappedTo !== undefined)
        toast.info(`Only ${result.cappedTo} in stock — your cart has been set to that.`);
      else toast.success("Added to cart");
    });
  }

  return (
    <form action={handleSubmit} className="flex items-center gap-3">
      <input type="hidden" name="listingId" value={listingId} />
      <Input
        name="quantity"
        type="number"
        min={1}
        max={maxQuantity ?? undefined}
        defaultValue={1}
        className="w-20"
        disabled={!inStock}
      />
      <Button type="submit" disabled={!inStock || isPending} className="flex-1">
        {isPending ? "Adding…" : inStock ? "Add to cart" : "Out of stock"}
      </Button>
    </form>
  );
}
