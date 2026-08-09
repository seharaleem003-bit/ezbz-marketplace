"use client";

import { useState, useTransition } from "react";

import { deleteCategoryAction } from "./actions";
import { Button } from "@/components/ui/button";

export function DeleteCategoryButton({ categoryId }: { categoryId: string }) {
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
            const result = await deleteCategoryAction(categoryId);
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
