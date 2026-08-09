"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/dal";

export async function setSellerStatusAction(
  sellerId: string,
  status: "APPROVED" | "REJECTED" | "SUSPENDED"
) {
  await requireAdmin();

  await prisma.seller.update({
    where: { id: sellerId },
    data: { status },
  });

  revalidatePath("/admin/sellers");
  revalidatePath("/sell");
}
