"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/dal";

export async function setProviderStatusAction(
  providerId: string,
  status: "ACTIVE" | "PENDING_VERIFICATION" | "REJECTED" | "SUSPENDED"
): Promise<void> {
  await requireAdmin();

  await prisma.serviceProvider.update({ where: { id: providerId }, data: { status } });

  revalidatePath("/admin/providers");
  revalidatePath("/services");
}
