"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/dal";

export async function setFundraiserStatusAction(
  fundraiserId: string,
  status: "APPROVED" | "REJECTED" | "SUSPENDED"
) {
  await requireAdmin();

  await prisma.fundraiser.update({
    where: { id: fundraiserId },
    data: { status },
  });

  revalidatePath("/admin/fundraisers");
  revalidatePath("/fundraisers");
}
