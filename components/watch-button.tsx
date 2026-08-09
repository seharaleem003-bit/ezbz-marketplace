"use client";

import { useState, useTransition } from "react";
import { Bell, BellOff } from "lucide-react";

import { toggleWatchAction } from "@/app/account/watches/actions";
import { Button } from "@/components/ui/button";

export function WatchButton({
  listingId,
  initialWatching,
}: {
  listingId: string;
  initialWatching: boolean;
}) {
  const [watching, setWatching] = useState(initialWatching);
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleWatchAction(listingId);
          setWatching(result.watching);
        })
      }
    >
      {watching ? <BellOff /> : <Bell />}
      {watching ? "Watching for price drops" : "Watch for price drops"}
    </Button>
  );
}
