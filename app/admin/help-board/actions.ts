"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/dal";
import { helpBoardNeedSchema } from "@/lib/validation/fundraiser";

export type CreateNeedState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

export async function createNeedAction(
  _prevState: CreateNeedState,
  formData: FormData
): Promise<CreateNeedState> {
  await requireAdmin();

  const parsed = helpBoardNeedSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    goal: formData.get("goal"),
    nonprofitPartnerId: formData.get("nonprofitPartnerId"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.helpBoardNeed.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      goalCents: Math.round(parsed.data.goal * 100),
      nonprofitPartnerId: parsed.data.nonprofitPartnerId ?? null,
    },
  });

  revalidatePath("/admin/help-board");
  revalidatePath("/help-board");
}

export async function markNeedDeliveredAction(needId: string) {
  await requireAdmin();

  await prisma.helpBoardNeed.update({
    where: { id: needId },
    data: { status: "CLOSED", deliveredAt: new Date() },
  });

  revalidatePath("/admin/help-board");
  revalidatePath("/help-board");
}
