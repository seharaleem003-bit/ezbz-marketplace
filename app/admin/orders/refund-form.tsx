"use client";

import { useActionState, useState } from "react";

import { refundOrderAction, type RefundState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RefundForm({
  orderId,
  maxRefundableCents,
}: {
  orderId: string;
  maxRefundableCents: number;
}) {
  const [state, formAction, pending] = useActionState<RefundState, FormData>(
    refundOrderAction,
    undefined
  );
  const [open, setOpen] = useState(false);

  if (maxRefundableCents <= 0) return null;

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Refund
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="flex items-center gap-1.5">
        <Input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          max={(maxRefundableCents / 100).toFixed(2)}
          placeholder={`Up to $${(maxRefundableCents / 100).toFixed(2)}`}
          className="h-8 w-32"
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Refunding…" : "Submit"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Leave blank for a full refund.</p>
      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="text-xs text-emerald-600">{state.success}</p> : null}
    </form>
  );
}
