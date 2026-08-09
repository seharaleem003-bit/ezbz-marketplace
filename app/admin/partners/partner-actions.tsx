"use client";

import { useActionState, useState, useTransition } from "react";

import {
  setPartnerStatusAction,
  linkPartnerContactAction,
  unlinkPartnerContactAction,
  type PartnerActionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PartnerStatusButtons({ partnerId, status }: { partnerId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  function setStatus(next: "APPROVED" | "PENDING" | "SUSPENDED") {
    startTransition(() => setPartnerStatusAction(partnerId, next));
  }

  return (
    <div className="flex gap-1.5">
      {status !== "APPROVED" ? (
        <Button variant="outline" size="sm" disabled={isPending} onClick={() => setStatus("APPROVED")}>
          Approve
        </Button>
      ) : null}
      {status === "APPROVED" ? (
        <Button variant="ghost" size="sm" disabled={isPending} onClick={() => setStatus("SUSPENDED")}>
          Suspend
        </Button>
      ) : null}
      {status === "SUSPENDED" ? (
        <Button variant="ghost" size="sm" disabled={isPending} onClick={() => setStatus("APPROVED")}>
          Reinstate
        </Button>
      ) : null}
    </div>
  );
}

export function PartnerContactLink({
  partnerId,
  contact,
}: {
  partnerId: string;
  contact: { name: string | null; email: string } | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<PartnerActionState, FormData>(
    linkPartnerContactAction.bind(null, partnerId),
    undefined
  );

  if (contact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span>{contact.name ?? contact.email}</span>
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => unlinkPartnerContactAction(partnerId))}
        >
          Unlink
        </Button>
      </div>
    );
  }

  if (!editing) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
        Link a contact
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-1">
      <div className="flex gap-1.5">
        <Input name="email" type="email" placeholder="contact@org.com" className="h-8 w-48 text-sm" required />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Linking…" : "Link"}
        </Button>
      </div>
      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
      {state?.fieldErrors?.email ? (
        <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
      ) : null}
    </form>
  );
}
