"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { addToCartAction } from "@/app/cart/actions";
import { Button } from "@/components/ui/button";

export function BuyNowButton({ listingId, inStock }: { listingId: string; inStock: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("listingId", listingId);
      formData.set("quantity", "1");
      await addToCartAction(formData);
      router.push("/checkout");
    });
  }

  return (
    <Button
      type="button"
      disabled={!inStock || isPending}
      onClick={handleClick}
      className="flex-1 bg-gold-500 text-navy-900 hover:bg-gold-400"
    >
      {isPending ? "Preparing checkout…" : inStock ? "Buy now" : "Out of stock"}
    </Button>
  );
}
