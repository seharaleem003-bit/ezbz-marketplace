"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/dal";
import { recalculateSellerBadge } from "@/lib/seller-badges";

export type FlagActionState = { error?: string } | undefined;

export async function addSellerFlagAction(
  sellerId: string,
  _prevState: FlagActionState,
  formData: FormData
): Promise<FlagActionState> {
  const session = await requireAdmin();

  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "A reason is required." };

  await prisma.sellerFlag.create({
    data: { sellerId, reason, createdById: session.user.id },
  });

  revalidatePath(`/admin/sellers/${sellerId}`);
  return undefined;
}

export async function removeSellerFlagAction(sellerId: string, flagId: string): Promise<void> {
  await requireAdmin();

  await prisma.sellerFlag.delete({ where: { id: flagId } });

  revalidatePath(`/admin/sellers/${sellerId}`);
}

export async function recalculateSellerBadgeAction(sellerId: string): Promise<void> {
  await requireAdmin();

  await recalculateSellerBadge(sellerId);

  revalidatePath(`/admin/sellers/${sellerId}`);
  revalidatePath("/admin/sellers");
}
