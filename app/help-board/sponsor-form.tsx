"use client";

import { useActionState } from "react";

import { sponsorNeedAction, type SponsorNeedState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SponsorForm({ needId }: { needId: string }) {
  const action = sponsorNeedAction.bind(null, needId);
  const [state, formAction, pending] = useActionState<SponsorNeedState, FormData>(
    action,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          name="amount"
          type="number"
          min="1"
          step="1"
          placeholder="$25"
          className="w-24"
          aria-label="Contribution amount"
          required
        />
        <Button type="submit" size="sm" disabled={pending} className="flex-1">
          {pending ? "Redirecting…" : "Sponsor this need"}
        </Button>
      </div>
      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
    </form>
  );
}
