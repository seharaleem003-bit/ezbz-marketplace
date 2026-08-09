"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";

import { toggleWatchAction } from "@/app/account/watches/actions";
import { cn } from "@/lib/utils";

export function ListingHeartButton({
  listingId,
  initialWatching,
}: {
  listingId: string;
  initialWatching: boolean;
}) {
  const [watching, setWatching] = useState(initialWatching);
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={watching ? "Remove from saved" : "Save this listing"}
      aria-pressed={watching}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleWatchAction(listingId);
          setWatching(result.watching);
        })
      }
      className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
    >
      <Heart className={cn("size-6", watching && "fill-destructive text-destructive")} />
    </button>
  );
}
