"use client";

import { useActionState } from "react";

import { createPartnerNeedAction, type PartnerNeedState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function PartnerNeedForm() {
  const [state, action, pending] = useActionState<PartnerNeedState, FormData>(
    createPartnerNeedAction,
    undefined
  );

  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <h2 className="font-medium">Post a need</h2>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="Family of 4 needs winter coats" required />
        {state?.fieldErrors?.title ? (
          <p className="text-sm text-destructive">{state.fieldErrors.title[0]}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} required />
        {state?.fieldErrors?.description ? (
          <p className="text-sm text-destructive">{state.fieldErrors.description[0]}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="goal">Goal ($)</Label>
        <Input id="goal" name="goal" type="number" min="1" step="1" required />
        {state?.fieldErrors?.goal ? (
          <p className="text-sm text-destructive">{state.fieldErrors.goal[0]}</p>
        ) : null}
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Posting…" : "Post need"}
      </Button>
    </form>
  );
}
