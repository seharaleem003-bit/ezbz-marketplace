"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { getStripe } from "@/lib/stripe";

// Same Stripe Identity flow as sellers (app/sell/verify/actions.ts), but
// with require_matching_selfie explicitly requested — the brief calls for
// stricter verification for service providers specifically ("Selfie/
// liveness check... to confirm the person submitting is the actual ID
// holder"), so this isn't left to Stripe's default document-only config.
export async function startProviderIdentityVerificationAction() {
  const session = await verifySession();

  const provider = await prisma.serviceProvider.findUnique({ where: { userId: session.user.id } });
  if (!provider) redirect("/services/apply");
  if (provider.identityVerifiedAt) redirect("/provider");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const stripe = getStripe();

  const verificationSession = await stripe.identity.verificationSessions.create({
    type: "document",
    return_url: `${appUrl}/provider/verify/complete`,
    metadata: { providerId: provider.id },
    options: {
      document: {
        require_matching_selfie: true,
      },
    },
  });

  await prisma.serviceProvider.update({
    where: { id: provider.id },
    data: { identityVerificationId: verificationSession.id },
  });

  if (!verificationSession.url) {
    throw new Error("Stripe Identity did not return a verification URL");
  }

  redirect(verificationSession.url);
}
