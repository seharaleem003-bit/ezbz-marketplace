"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, CalendarClock, CheckCircle2, Tag, Truck } from "lucide-react";
import { toast } from "sonner";

import { addToCartAction } from "@/app/cart/actions";
import { requestPrebookNotifyAction, type NotifyMeState } from "./prebook-actions";
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

export interface PrebookLabels {
  prebookNow: string;
  notifyMe: string;
  reserving: string;
  releaseOn: string;
  discountNote: string;
  notifyTitle: string;
  notifyBlurb: string;
  email: string;
  phone: string;
  phoneOptional: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successBlurb: string;
}

export function PrebookPanel({
  listingId,
  releaseAt,
  fullPriceLabel,
  discountedPriceLabel,
  savingLabel,
  deliveryNote,
  labels,
}: {
  listingId: string;
  releaseAt: string | null;
  fullPriceLabel: string;
  discountedPriceLabel: string;
  savingLabel: string;
  deliveryNote: string;
  labels: PrebookLabels;
}) {
  const router = useRouter();
  const [isReserving, startReserving] = useTransition();
  const [notifyOpen, setNotifyOpen] = useState(false);

  const [notifyState, notifyAction, notifyPending] = useActionState<NotifyMeState, FormData>(
    requestPrebookNotifyAction,
    undefined
  );

  function reserve() {
    startReserving(async () => {
      const formData = new FormData();
      formData.set("listingId", listingId);
      formData.set("quantity", "1");
      await addToCartAction(formData);
      router.push("/checkout");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gold-500/40 bg-gold-500/5 p-4">
      {releaseAt ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="size-4 text-gold-600" />
          {labels.releaseOn} <span className="font-medium text-foreground">{releaseAt}</span>
        </p>
      ) : null}

      <div className="flex items-baseline gap-2">
        <span className="text-sm text-muted-foreground line-through">{fullPriceLabel}</span>
        <span className="text-2xl font-semibold">{discountedPriceLabel}</span>
      </div>
      <p className="flex items-center gap-1.5 text-sm font-medium text-gold-700 dark:text-gold-400">
        <Tag className="size-4" />
        {labels.discountNote} — {savingLabel}
      </p>

      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Truck className="size-4" />
        {deliveryNote}
      </p>

      <div className="mt-1 flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={reserve}
          disabled={isReserving}
          className="flex-1 bg-gold-500 text-navy-900 hover:bg-gold-400"
        >
          {isReserving ? labels.reserving : labels.prebookNow}
        </Button>

        <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
          <DialogTrigger render={<Button type="button" variant="outline" className="flex-1" />}>
            <BellRing />
            {labels.notifyMe}
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            {notifyState?.success ? (
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
                  <DialogTitle>{labels.notifyTitle}</DialogTitle>
                  <DialogDescription>{labels.notifyBlurb}</DialogDescription>
                </DialogHeader>

                <form action={notifyAction} className="flex flex-col gap-4">
                  <input type="hidden" name="listingId" value={listingId} />

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="notify-email">{labels.email}</Label>
                    <Input id="notify-email" name="email" type="email" required />
                    {notifyState?.fieldErrors?.email ? (
                      <p className="text-xs text-destructive">
                        {notifyState.fieldErrors.email[0]}
                      </p>
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
                    {notifyState?.fieldErrors?.phone ? (
                      <p className="text-xs text-destructive">
                        {notifyState.fieldErrors.phone[0]}
                      </p>
                    ) : null}
                  </div>

                  {notifyState?.error ? (
                    <p className="text-sm text-destructive" role="alert">
                      {notifyState.error}
                    </p>
                  ) : null}

                  <Button type="submit" disabled={notifyPending}>
                    {notifyPending ? labels.submitting : labels.submit}
                  </Button>
                </form>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
