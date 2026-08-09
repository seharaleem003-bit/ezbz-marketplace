"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { getStripe } from "@/lib/stripe";

// ID + liveness verification is handled entirely by Stripe Identity — we
// never see or store raw documents/selfies ourselves, only the resulting
// verified/unverified status (set by the identity.verification_session.*
// webhook in app/api/webhooks/stripe/route.ts).
export async function startIdentityVerificationAction() {
  const session = await verifySession();

  const seller = await prisma.seller.findUnique({ where: { userId: session.user.id } });
  if (!seller || seller.status !== "APPROVED") {
    redirect("/sell");
  }
  if (seller.identityVerifiedAt) {
    redirect("/sell");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const stripe = getStripe();

  const verificationSession = await stripe.identity.verificationSessions.create({
    type: "document",
    return_url: `${appUrl}/sell/verify/complete`,
    metadata: { sellerId: seller.id },
  });

  await prisma.seller.update({
    where: { id: seller.id },
    data: { identityVerificationId: verificationSession.id },
  });

  if (!verificationSession.url) {
    throw new Error("Stripe Identity did not return a verification URL");
  }

  redirect(verificationSession.url);
}
