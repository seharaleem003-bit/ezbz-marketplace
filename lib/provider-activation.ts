import "server-only";

import { prisma } from "@/lib/prisma";

// The compliance gate from the brief: "Only after ID + liveness +
// background check all pass should a service provider's listing go live" —
// plus an active paid subscription, since that's what actually makes the
// listing live vs. just verified. Automatic, not a discretionary admin
// review (unlike product-seller approval) — admin can still SUSPEND/REJECT
// as an override. Called from three places once each gate clears: Stripe
// Identity verification, the subscription checkout webhook, and the Checkr
// background-check webhook.
export async function activateProviderIfEligible(providerId: string) {
  const provider = await prisma.serviceProvider.findUnique({
    where: { id: providerId },
    include: { subscriptions: { where: { status: "ACTIVE", endsAt: { gt: new Date() } } } },
  });
  if (!provider) return;
  if (provider.status !== "PENDING_VERIFICATION") return;

  const eligible =
    Boolean(provider.identityVerifiedAt) &&
    provider.backgroundCheckStatus === "CLEAR" &&
    provider.subscriptions.length > 0;

  if (eligible) {
    await prisma.serviceProvider.update({ where: { id: providerId }, data: { status: "ACTIVE" } });
  }
}
