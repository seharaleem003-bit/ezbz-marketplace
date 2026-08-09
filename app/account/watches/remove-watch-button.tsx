"use client";

import { useTransition } from "react";

import { removeWatchAction } from "./actions";
import { Button } from "@/components/ui/button";

export function RemoveWatchButton({ watchId }: { watchId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => removeWatchAction(watchId))}
    >
      Remove
    </Button>
  );
}
