"use client";

import { useActionState } from "react";

import { applyForFundraiserAction, type FundraiserApplyState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function FundraiserApplyForm() {
  const [state, action, pending] = useActionState<FundraiserApplyState, FormData>(
    applyForFundraiserAction,
    undefined
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Organization name</Label>
        <Input id="name" name="name" placeholder="Lincoln Elementary PTA" required />
        {state?.fieldErrors?.name ? (
          <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cause">Tell us about your cause</Label>
        <Textarea
          id="cause"
          name="cause"
          rows={5}
          placeholder="What are you raising funds for, and how will donated items help?"
          required
        />
        {state?.fieldErrors?.cause ? (
          <p className="text-sm text-destructive">{state.fieldErrors.cause[0]}</p>
        ) : null}
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
