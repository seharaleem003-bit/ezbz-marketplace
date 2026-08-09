"use client";

import { useActionState } from "react";

import { purchaseSubscriptionAction, type SubscribeState } from "./actions";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/format";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanKey } from "@/lib/subscription-plans";

function PlanButton({ plan }: { plan: SubscriptionPlanKey }) {
  const details = SUBSCRIPTION_PLANS[plan];
  const [state, action, pending] = useActionState<SubscribeState, FormData>(
    purchaseSubscriptionAction.bind(null, plan),
    undefined
  );

  return (
    <form action={action} className="flex flex-col gap-1">
      <Button type="submit" variant="outline" size="sm" disabled={pending} className="w-full">
        {pending ? "Redirecting…" : `${details.label} — ${formatCents(details.priceCents)}`}
      </Button>
      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
    </form>
  );
}

export function SubscribeButtons() {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <PlanButton plan="THREE_MONTH" />
      <PlanButton plan="SIX_MONTH" />
      <PlanButton plan="TWELVE_MONTH" />
    </div>
  );
}
