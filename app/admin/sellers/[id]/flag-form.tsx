"use client";

import { useActionState } from "react";

import { addSellerFlagAction, type FlagActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function FlagForm({ sellerId }: { sellerId: string }) {
  const [state, action, pending] = useActionState<FlagActionState, FormData>(
    addSellerFlagAction.bind(null, sellerId),
    undefined
  );

  return (
    <form action={action} className="flex flex-col gap-2">
      <Label htmlFor="reason">Flag a policy violation</Label>
      <Textarea id="reason" name="reason" placeholder="Describe the violation…" required />
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" variant="outline" size="sm" disabled={pending} className="w-fit">
        {pending ? "Flagging…" : "Add flag"}
      </Button>
    </form>
  );
}
