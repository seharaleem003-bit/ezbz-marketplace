"use client";

import { useTransition } from "react";

import { recalculateSellerBadgeAction, removeSellerFlagAction } from "./actions";
import { Button } from "@/components/ui/button";

export function RecalculateButton({ sellerId }: { sellerId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => recalculateSellerBadgeAction(sellerId))}
    >
      {isPending ? "Recalculating…" : "Recalculate now"}
    </Button>
  );
}

export function RemoveFlagButton({ sellerId, flagId }: { sellerId: string; flagId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => removeSellerFlagAction(sellerId, flagId))}
    >
      Remove
    </Button>
  );
}
