"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/dal";
import { refundOrder, RefundError } from "@/lib/refund";

export type RefundState = { error?: string; success?: string } | undefined;

export async function refundOrderAction(
  _prevState: RefundState,
  formData: FormData
): Promise<RefundState> {
  await requireAdmin();

  const orderId = formData.get("orderId") as string;
  const amountRaw = formData.get("amount") as string | null;

  if (!orderId) return { error: "Missing order" };

  const amountCents = amountRaw && amountRaw.trim() !== "" ? Math.round(Number(amountRaw) * 100) : undefined;
  if (amountCents !== undefined && (!Number.isFinite(amountCents) || amountCents <= 0)) {
    return { error: "Enter a valid refund amount" };
  }

  try {
    const result = await refundOrder(orderId, amountCents);
    revalidatePath("/admin/orders");
    return {
      success: result.isFullRefund
        ? "Order fully refunded."
        : `Refunded $${(result.amountCents / 100).toFixed(2)}.`,
    };
  } catch (error) {
    if (error instanceof RefundError) return { error: error.message };
    console.error("Refund failed", error);
    return { error: "Refund failed — check server logs." };
  }
}
