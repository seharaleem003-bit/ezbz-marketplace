"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";

import { toggleWatchAction } from "@/app/account/watches/actions";
import { cn } from "@/lib/utils";

export function ListingHeartButton({
  listingId,
  initialWatching,
  className,
  iconClassName = "size-6",
}: {
  listingId: string;
  initialWatching: boolean;
  /** Wrapper styling — the card uses it to render a round chip like the share button. */
  className?: string;
  iconClassName?: string;
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
      className={cn(
        "text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50",
        className
      )}
    >
      <Heart className={cn(iconClassName, watching && "fill-destructive text-destructive")} />
    </button>
  );
}
