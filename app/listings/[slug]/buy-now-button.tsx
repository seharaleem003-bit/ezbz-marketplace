"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { addToCartAction } from "@/app/cart/actions";
import { Button } from "@/components/ui/button";

export function BuyNowButton({
  listingId,
  inStock,
  labels,
}: {
  listingId: string;
  inStock: boolean;
  labels: { buyNow: string; outOfStock: string };
}) {
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
      {isPending ? "…" : inStock ? labels.buyNow : labels.outOfStock}
    </Button>
  );
}
