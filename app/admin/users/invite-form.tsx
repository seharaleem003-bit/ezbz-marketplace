"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteStaffAction, type UserActionState } from "./actions";

export function InviteForm() {
  const [state, action, pending] = useActionState<UserActionState, FormData>(
    inviteStaffAction,
    undefined
  );

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="name@example.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name (optional)</Label>
          <Input id="name" name="name" placeholder="Their name" />
        </div>
      </div>

      <Button type="submit" disabled={pending} className="w-fit">
        <UserPlus />
        {pending ? "Sending invite…" : "Add catalogue staff"}
      </Button>

      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-green-700" role="status">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
