"use client";

import { useActionState } from "react";

import { createPartnerAction, type PartnerActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PartnerForm() {
  const [state, action, pending] = useActionState<PartnerActionState, FormData>(
    createPartnerAction,
    undefined
  );

  const errors = state?.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Organization name</Label>
        <Input id="name" name="name" required />
        {errors.name ? <p className="text-sm text-destructive">{errors.name[0]}</p> : null}
      </div>
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Adding…" : "Add partner"}
      </Button>
    </form>
  );
}
