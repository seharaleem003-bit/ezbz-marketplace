"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { isCheckrConfigured, createBackgroundCheckInvitation } from "@/lib/checkr";

export type BackgroundCheckState = { error?: string } | undefined;

export async function startBackgroundCheckAction(): Promise<BackgroundCheckState> {
  const session = await verifySession();

  const provider = await prisma.serviceProvider.findUnique({
    where: { userId: session.user.id },
    include: { user: true },
  });
  if (!provider) redirect("/services/apply");
  if (provider.backgroundCheckStatus === "CLEAR" || provider.backgroundCheckStatus === "PENDING") {
    redirect("/provider");
  }

  if (!isCheckrConfigured()) {
    return {
      error:
        "Background checks aren't wired up on this deployment yet — contact EZBZ support to get verified.",
    };
  }

  const [firstName, ...rest] = provider.businessName.split(" ");
  const invitation = await createBackgroundCheckInvitation({
    email: provider.user.email,
    firstName: firstName || provider.businessName,
    lastName: rest.join(" ") || "Provider",
  });

  await prisma.serviceProvider.update({
    where: { id: provider.id },
    data: { backgroundCheckId: invitation.candidateId, backgroundCheckStatus: "PENDING" },
  });

  if (invitation.invitationUrl) {
    redirect(invitation.invitationUrl);
  }

  redirect("/provider");
}
