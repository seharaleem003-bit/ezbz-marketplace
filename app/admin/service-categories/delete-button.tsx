"use client";

import { useState, useTransition } from "react";

import { deleteServiceCategoryAction } from "./actions";
import { Button } from "@/components/ui/button";

export function DeleteServiceCategoryButton({ categoryId }: { categoryId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteServiceCategoryAction(categoryId);
            setError(result?.error ?? null);
          })
        }
      >
        Delete
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
