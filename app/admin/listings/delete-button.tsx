"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteListingAction } from "./actions";

export function DeleteListingButton({
  listingId,
  title,
}: {
  listingId: string;
  title: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        aria-label={`Delete ${title}`}
        title="Delete listing"
        disabled={pending}
        onClick={() => {
          // Deleting is permanent and there's no undo, so it asks first.
          if (!confirm(`Delete "${title}" permanently? This can't be undone.`)) return;
          setError(null);
          start(async () => {
            const result = await deleteListingAction(listingId);
            if (result?.error) setError(result.error);
          });
        }}
        className="ml-1 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
      >
        <Trash2 className="size-4" />
      </button>

      {/* Shown inline rather than as a toast: the usual failure is "this is on
          an order", which is an explanation the admin needs to read. */}
      {error ? (
        <p className="mt-1 max-w-xs text-right text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
