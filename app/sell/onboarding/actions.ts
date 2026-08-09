"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { getOrCreateConnectAccount, createConnectOnboardingLink } from "@/lib/connect";

export async function startConnectOnboardingAction() {
  const session = await verifySession();

  const seller = await prisma.seller.findUnique({ where: { userId: session.user.id } });
  if (!seller || seller.status !== "APPROVED") {
    redirect("/sell");
  }

  const accountId = await getOrCreateConnectAccount({
    kind: "seller",
    id: seller.id,
    email: session.user.email ?? "",
    existingAccountId: seller.stripeAccountId,
  });

  const url = await createConnectOnboardingLink(accountId);
  redirect(url);
}
