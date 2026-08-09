"use client";

import { useActionState } from "react";

import { createNeedAction, type CreateNeedState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function NeedForm({ partners }: { partners: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<CreateNeedState, FormData>(
    createNeedAction,
    undefined
  );

  return (
    <form action={action} className="flex max-w-md flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <h2 className="font-medium">Post a need</h2>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="need-title">Title</Label>
        <Input id="need-title" name="title" placeholder="Family of 4 needs winter coats" required />
        {state?.fieldErrors?.title ? (
          <p className="text-sm text-destructive">{state.fieldErrors.title[0]}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="need-description">Description</Label>
        <Textarea id="need-description" name="description" rows={3} required />
        {state?.fieldErrors?.description ? (
          <p className="text-sm text-destructive">{state.fieldErrors.description[0]}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="need-goal">Goal ($)</Label>
        <Input id="need-goal" name="goal" type="number" min="1" step="1" required />
        {state?.fieldErrors?.goal ? (
          <p className="text-sm text-destructive">{state.fieldErrors.goal[0]}</p>
        ) : null}
      </div>
      {partners.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="need-partner">Posted on behalf of (optional)</Label>
          <Select
            name="nonprofitPartnerId"
            items={partners.map((partner) => ({ value: partner.id, label: partner.name }))}
          >
            <SelectTrigger id="need-partner">
              <SelectValue placeholder="EZBZ (no partner)" />
            </SelectTrigger>
            <SelectContent>
              {partners.map((partner) => (
                <SelectItem key={partner.id} value={partner.id}>
                  {partner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Posting…" : "Post need"}
      </Button>
    </form>
  );
}
