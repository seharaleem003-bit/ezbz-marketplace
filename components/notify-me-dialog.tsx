"use client";

import { useActionState } from "react";
import { BellRing, CheckCircle2 } from "lucide-react";

import {
  requestPrebookNotifyAction,
  type NotifyMeState,
} from "@/app/listings/[slug]/prebook-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface NotifyMeLabels {
  trigger: string;
  title: string;
  blurb: string;
  email: string;
  phone: string;
  phoneOptional: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successBlurb: string;
}

/**
 * "Tell me when this is available" capture, shared by pre-book listings and
 * sold-out ones — both are cases where the buyer wants the item but can't
 * have it yet, so they get the same sign-up.
 */
export function NotifyMeDialog({
  listingId,
  labels,
  triggerClassName,
  fullWidth = false,
}: {
  listingId: string;
  labels: NotifyMeLabels;
  triggerClassName?: string;
  fullWidth?: boolean;
}) {
  const [state, action, pending] = useActionState<NotifyMeState, FormData>(
    requestPrebookNotifyAction,
    undefined
  );

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={triggerClassName ?? (fullWidth ? "w-full" : undefined)}
          />
        }
      >
        <BellRing />
        {labels.trigger}
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        {state?.success ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="size-8 text-gold-500" />
            <div>
              <p className="font-medium">{labels.successTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">{labels.successBlurb}</p>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{labels.title}</DialogTitle>
              <DialogDescription>{labels.blurb}</DialogDescription>
            </DialogHeader>

            <form action={action} className="flex flex-col gap-4">
              <input type="hidden" name="listingId" value={listingId} />

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notify-email">{labels.email}</Label>
                <Input id="notify-email" name="email" type="email" required />
                {state?.fieldErrors?.email ? (
                  <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notify-phone">
                  {labels.phone}{" "}
                  <span className="font-normal text-muted-foreground">
                    {labels.phoneOptional}
                  </span>
                </Label>
                <Input id="notify-phone" name="phone" type="tel" />
                {state?.fieldErrors?.phone ? (
                  <p className="text-xs text-destructive">{state.fieldErrors.phone[0]}</p>
                ) : null}
              </div>

              {state?.error ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.error}
                </p>
              ) : null}

              <Button type="submit" disabled={pending}>
                {pending ? labels.submitting : labels.submit}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
