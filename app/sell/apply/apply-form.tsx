"use client";

import { useActionState } from "react";

import { applyToSellAction, type SellerApplyState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SellerApplyForm() {
  const [state, action, pending] = useActionState<SellerApplyState, FormData>(
    applyToSellAction,
    undefined
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="displayName">Seller / shop name</Label>
        <Input id="displayName" name="displayName" placeholder="Maria's Vintage Finds" required />
        {state?.fieldErrors?.displayName ? (
          <p className="text-sm text-destructive">{state.fieldErrors.displayName[0]}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bio">About you (optional)</Label>
        <Textarea id="bio" name="bio" rows={4} placeholder="What do you sell?" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">City (optional)</Label>
          <Input id="city" name="city" placeholder="Irving" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="region">State (optional)</Label>
          <Input id="region" name="region" placeholder="TX" />
        </div>
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
