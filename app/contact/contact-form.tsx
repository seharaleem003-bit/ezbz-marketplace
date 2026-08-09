"use client";

import { useActionState } from "react";

import { createSupportTicketAction, type SupportTicketState } from "@/app/support/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const [state, action, pending] = useActionState<SupportTicketState, FormData>(
    createSupportTicketAction,
    undefined
  );

  if (state?.ticketNumber) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm">
        <p className="font-medium">Got it — thanks!</p>
        <p className="mt-1 text-muted-foreground">
          We&apos;ll reply by email. Your reference number is{" "}
          <span className="font-medium text-foreground">{state.ticketNumber}</span>.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact-email">Email</Label>
        <Input id="contact-email" name="email" type="email" required />
        {state?.fieldErrors?.email ? (
          <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea id="contact-message" name="message" rows={5} required />
        {state?.fieldErrors?.message ? (
          <p className="text-xs text-destructive">{state.fieldErrors.message[0]}</p>
        ) : null}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
