"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";

import { createSupportTicketAction, type SupportTicketState } from "@/app/support/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function SupportTicketDialog({
  trigger,
  triggerClassName,
  dialogTitle,
  description,
  defaultMessage,
  submitLabel = "Send",
}: {
  trigger: ReactNode;
  triggerClassName?: string;
  dialogTitle: string;
  description: string;
  defaultMessage?: string;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState<SupportTicketState, FormData>(
    createSupportTicketAction,
    undefined
  );

  return (
    <Dialog>
      <DialogTrigger
        render={<button type="button" className={triggerClassName} />}
      >
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {state?.ticketNumber ? (
          <div className="rounded-lg border bg-card p-4 text-sm">
            <p className="font-medium">Got it — thanks!</p>
            <p className="mt-1 text-muted-foreground">
              We&apos;ll reply by email. Your reference number is{" "}
              <span className="font-medium text-foreground">{state.ticketNumber}</span>.
            </p>
          </div>
        ) : (
          <form action={action} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ticket-dialog-email">Your email</Label>
              <Input id="ticket-dialog-email" name="email" type="email" required />
              {state?.fieldErrors?.email ? (
                <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ticket-dialog-message">Message</Label>
              <Textarea
                id="ticket-dialog-message"
                name="message"
                rows={4}
                required
                defaultValue={defaultMessage}
              />
              {state?.fieldErrors?.message ? (
                <p className="text-xs text-destructive">{state.fieldErrors.message[0]}</p>
              ) : null}
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : submitLabel}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
