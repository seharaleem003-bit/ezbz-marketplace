"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { getStripe } from "@/lib/stripe";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanKey } from "@/lib/subscription-plans";

export type SubscribeState = { error?: string } | undefined;

// A flat one-time Stripe Checkout payment, not recurring Stripe Billing —
// matches the schema's fixed-duration model (see the webhook's
// handleServiceSubscriptionCompleted) and needs no separate Stripe product/
// price setup in the dashboard.
export async function purchaseSubscriptionAction(plan: SubscriptionPlanKey): Promise<SubscribeState> {
  const session = await verifySession();

  const provider = await prisma.serviceProvider.findUnique({ where: { userId: session.user.id } });
  if (!provider) redirect("/services/apply");

  const planDetails = SUBSCRIPTION_PLANS[plan];
  if (!planDetails) return { error: "Invalid plan." };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const stripe = getStripe();

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: planDetails.priceCents,
          product_data: { name: `EZBZ Services listing — ${planDetails.label}` },
        },
      },
    ],
    metadata: { providerId: provider.id, plan },
    success_url: `${appUrl}/provider?subscribed=1`,
    cancel_url: `${appUrl}/provider`,
  });

  if (!checkoutSession.url) {
    return { error: "Could not start checkout. Please try again." };
  }

  redirect(checkoutSession.url);
}
