"use client";

import { useActionState } from "react";

import type { ServiceCategoryActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BoundAction = (
  prevState: ServiceCategoryActionState,
  formData: FormData
) => Promise<ServiceCategoryActionState>;

export function ServiceCategoryForm({
  action: boundAction,
  defaults,
  submitLabel,
}: {
  action: BoundAction;
  defaults?: { name: string; group: string; sortOrder: number };
  submitLabel: string;
}) {
  const [state, action, pending] = useActionState<ServiceCategoryActionState, FormData>(
    boundAction,
    undefined
  );

  const errors = state?.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={defaults?.name} required />
        {errors.name ? <p className="text-sm text-destructive">{errors.name[0]}</p> : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="group">Group</Label>
        <Input
          id="group"
          name="group"
          placeholder="Home & Repair"
          defaultValue={defaults?.group}
          required
        />
        {errors.group ? <p className="text-sm text-destructive">{errors.group[0]}</p> : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sortOrder">Sort order</Label>
        <Input
          id="sortOrder"
          name="sortOrder"
          type="number"
          defaultValue={defaults?.sortOrder ?? 0}
        />
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
