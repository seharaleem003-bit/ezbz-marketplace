import "server-only";

import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// Shared by Seller and Fundraiser onboarding (both get paid out via Stripe
// Connect Express accounts) — kept generic rather than seller-specific.
export async function getOrCreateConnectAccount({
  kind,
  id,
  email,
  existingAccountId,
}: {
  kind: "seller" | "fundraiser";
  id: string;
  email: string;
  existingAccountId: string | null;
}): Promise<string> {
  if (existingAccountId) return existingAccountId;

  const stripe = getStripe();
  const account = await stripe.accounts.create({
    type: "express",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: { kind, id },
  });

  if (kind === "seller") {
    await prisma.seller.update({ where: { id }, data: { stripeAccountId: account.id } });
  } else {
    await prisma.fundraiser.update({ where: { id }, data: { stripeAccountId: account.id } });
  }

  return account.id;
}

export async function createConnectOnboardingLink(accountId: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const stripe = getStripe();
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${appUrl}/sell/onboarding/refresh`,
    return_url: `${appUrl}/sell/onboarding/complete`,
  });

  return accountLink.url;
}
