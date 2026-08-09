"use client";

import { useActionState } from "react";

import { startBackgroundCheckAction, type BackgroundCheckState } from "./actions";
import { Button } from "@/components/ui/button";

export function BackgroundCheckButton() {
  const [state, action, pending] = useActionState<BackgroundCheckState, FormData>(
    startBackgroundCheckAction,
    undefined
  );

  return (
    <form action={action} className="flex flex-col gap-2">
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Starting…" : "Start background check"}
      </Button>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}
