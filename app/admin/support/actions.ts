"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/dal";

export async function resolveTicketAction(ticketId: string) {
  await requireAdmin();

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: "RESOLVED" },
  });

  revalidatePath("/admin/support");
}
