"use client";

import { useActionState } from "react";

import type { CategoryActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BoundCategoryAction = (
  prevState: CategoryActionState,
  formData: FormData
) => Promise<CategoryActionState>;

export function CategoryForm({
  action: boundAction,
  defaultName,
  submitLabel,
}: {
  action: BoundCategoryAction;
  defaultName?: string;
  submitLabel: string;
}) {
  const [state, action, pending] = useActionState<CategoryActionState, FormData>(
    boundAction,
    undefined
  );

  const errors = state?.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={defaultName} required />
        {errors.name ? <p className="text-sm text-destructive">{errors.name[0]}</p> : null}
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
