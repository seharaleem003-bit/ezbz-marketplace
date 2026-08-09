"use client";

import { useTransition } from "react";

import { setSellerListingStatusAction } from "./actions";
import { Button } from "@/components/ui/button";

export function SellerListingStatusActions({
  listingId,
  status,
}: {
  listingId: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}) {
  const [isPending, startTransition] = useTransition();

  function setStatus(next: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
    startTransition(async () => {
      await setSellerListingStatusAction(listingId, next);
    });
  }

  return (
    <div className="flex justify-end gap-1.5">
      {status !== "PUBLISHED" ? (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => setStatus("PUBLISHED")}
        >
          Publish
        </Button>
      ) : null}
      {status !== "DRAFT" ? (
        <Button variant="outline" size="sm" disabled={isPending} onClick={() => setStatus("DRAFT")}>
          Unpublish
        </Button>
      ) : null}
      {status !== "ARCHIVED" ? (
        <Button variant="ghost" size="sm" disabled={isPending} onClick={() => setStatus("ARCHIVED")}>
          Archive
        </Button>
      ) : null}
    </div>
  );
}
