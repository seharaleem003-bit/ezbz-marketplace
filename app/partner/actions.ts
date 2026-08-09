"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { helpBoardNeedSchema } from "@/lib/validation/fundraiser";

export type PartnerNeedState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

export async function createPartnerNeedAction(
  _prevState: PartnerNeedState,
  formData: FormData
): Promise<PartnerNeedState> {
  const session = await verifySession();

  const partner = await prisma.nonprofitPartner.findUnique({
    where: { contactUserId: session.user.id },
  });
  if (!partner) redirect("/partner");
  if (partner.status !== "APPROVED") {
    return { error: "Your organization isn't approved yet — needs can't be posted until it is." };
  }

  const parsed = helpBoardNeedSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    goal: formData.get("goal"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await prisma.helpBoardNeed.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      goalCents: Math.round(parsed.data.goal * 100),
      nonprofitPartnerId: partner.id,
      postedByUserId: session.user.id,
    },
  });

  revalidatePath("/partner");
  revalidatePath("/help-board");
  return undefined;
}
