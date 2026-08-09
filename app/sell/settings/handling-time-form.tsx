"use client";

import { useActionState } from "react";

import { updateHandlingDaysAction, type HandlingDaysState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function HandlingTimeForm({ defaultDays }: { defaultDays: number }) {
  const [state, action, pending] = useActionState<HandlingDaysState, FormData>(
    updateHandlingDaysAction,
    undefined
  );

  const errors = state?.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="handlingDays">Handling time (business days)</Label>
        <Input
          id="handlingDays"
          name="handlingDays"
          type="number"
          min={1}
          max={30}
          defaultValue={defaultDays}
          className="max-w-32"
          required
        />
        {errors.handlingDays ? (
          <p className="text-sm text-destructive">{errors.handlingDays[0]}</p>
        ) : null}
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Save handling time"}
      </Button>
    </form>
  );
}
