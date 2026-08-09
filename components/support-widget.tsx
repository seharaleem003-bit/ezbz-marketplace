"use client";

import { useActionState, useState } from "react";
import { MessageCircleQuestion, X } from "lucide-react";

import { createSupportTicketAction, type SupportTicketState } from "@/app/support/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<SupportTicketState, FormData>(
    createSupportTicketAction,
    undefined
  );

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open ? (
        <div className="w-80 rounded-xl bg-card p-4 shadow-lg ring-1 ring-foreground/10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Chat with us</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X />
            </Button>
          </div>

          {state?.ticketNumber ? (
            <div className="py-4 text-sm">
              <p className="font-medium">Got it — thanks!</p>
              <p className="mt-1 text-muted-foreground">
                We&apos;ll reply by email. Your reference number is{" "}
                <span className="font-medium text-foreground">{state.ticketNumber}</span>.
              </p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                Leave your email and a message — we don&apos;t do live chat, but a real person
                will follow up.
              </p>
              <form action={action} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="support-email" className="text-xs">
                    Email
                  </Label>
                  <Input id="support-email" name="email" type="email" required />
                  {state?.fieldErrors?.email ? (
                    <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="support-message" className="text-xs">
                    Message
                  </Label>
                  <Textarea id="support-message" name="message" rows={3} required />
                  {state?.fieldErrors?.message ? (
                    <p className="text-xs text-destructive">{state.fieldErrors.message[0]}</p>
                  ) : null}
                </div>
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? "Sending…" : "Send"}
                </Button>
              </form>
            </>
          )}
        </div>
      ) : null}

      <Button
        type="button"
        size="icon-lg"
        className="rounded-full shadow-lg"
        onClick={() => setOpen((v) => !v)}
        aria-label="Chat with us"
      >
        {open ? <X /> : <MessageCircleQuestion />}
      </Button>
    </div>
  );
}
