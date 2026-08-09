"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { addToCartAction } from "@/app/cart/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddToCartForm({ listingId, inStock }: { listingId: string; inStock: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addToCartAction(formData);
      toast.success("Added to cart");
    });
  }

  return (
    <form action={handleSubmit} className="flex items-center gap-3">
      <input type="hidden" name="listingId" value={listingId} />
      <Input
        name="quantity"
        type="number"
        min={1}
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
