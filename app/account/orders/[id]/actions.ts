"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { refundOrder, RefundError } from "@/lib/refund";
import { addressSchema } from "@/lib/validation/address";

// A buyer may only change an order while it's still with us. Once it's handed
// to a carrier the address is printed on a label and the goods are gone, so
// edits have to go through support instead.
const EDITABLE_STATUSES = ["PLACED", "PROCESSING"] as const;

export type OrderEditState = { error?: string; success?: string } | undefined;

/** Loads the order and refuses anything the buyer isn't allowed to touch. */
async function loadEditableOrder(orderId: string) {
  const session = await verifySession();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || order.userId !== session.user.id) {
    return { error: "Order not found." as const };
  }
  if (!(EDITABLE_STATUSES as readonly string[]).includes(order.status)) {
    return {
      error:
        order.status === "CANCELLED"
          ? ("This order has already been cancelled." as const)
          : ("This order has already shipped and can no longer be changed." as const),
    };
  }

  return { order };
}

export async function cancelOrderAction(
  orderId: string,
  _prevState: OrderEditState,
  _formData: FormData
): Promise<OrderEditState> {
  const loaded = await loadEditableOrder(orderId);
  if ("error" in loaded) return { error: loaded.error };
  const { order } = loaded;

  // An unpaid order never took the buyer's money, so there's nothing to
  // refund — just release the stock it was holding.
  if (order.paymentStatus === "PENDING" || order.paymentStatus === "FAILED") {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });
      for (const item of order.items) {
        if (!item.listingId) continue; // listing deleted since — nothing to restock
        await tx.listing.update({
          where: { id: item.listingId },
          data: { inventoryQty: { increment: item.quantity } },
        });
      }
    });

    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath("/account/orders");
    return { success: "Your order has been cancelled." };
  }

  try {
    // refundOrder handles the Stripe refund, reverses the seller's payout,
    // restocks inventory, flips the status to CANCELLED, and emails a receipt.
    await refundOrder(order.id);
  } catch (error) {
    if (error instanceof RefundError) return { error: error.message };
    console.error(`Failed to cancel order ${orderId}`, error);
    return { error: "We couldn't cancel this order. Please contact support." };
  }

  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/account/orders");
  return { success: "Your order has been cancelled and refunded." };
}

export async function updateOrderAddressAction(
  orderId: string,
  _prevState: OrderEditState,
  formData: FormData
): Promise<OrderEditState> {
  const loaded = await loadEditableOrder(orderId);
  if ("error" in loaded) return { error: loaded.error };
  const { order } = loaded;

  if (order.shippingMethod === "PICKUP") {
    return { error: "This is a local pickup order — there's no delivery address to change." };
  }

  const parsed = addressSchema.safeParse({
    fullName: formData.get("shippingName"),
    line1: formData.get("shippingLine1"),
    line2: formData.get("shippingLine2") || undefined,
    city: formData.get("shippingCity"),
    state: formData.get("shippingState"),
    postalCode: formData.get("shippingPostal"),
    country: formData.get("shippingCountry"),
  });

  if (!parsed.success) {
    return { error: "Please check the address fields and try again." };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      shippingName: parsed.data.fullName,
      shippingLine1: parsed.data.line1,
      shippingLine2: parsed.data.line2 ?? null,
      shippingCity: parsed.data.city,
      shippingState: parsed.data.state,
      shippingPostal: parsed.data.postalCode,
      shippingCountry: parsed.data.country,
    },
  });

  revalidatePath(`/account/orders/${orderId}`);
  return { success: "Delivery address updated." };
}

/**
 * Reduces or removes a line. Increases aren't handled here — charging more
 * needs a fresh payment, which this flow has no way to collect.
 */
export async function reduceOrderItemAction(
  orderId: string,
  orderItemId: string,
  newQuantity: number
): Promise<OrderEditState> {
  const loaded = await loadEditableOrder(orderId);
  if ("error" in loaded) return { error: loaded.error };
  const { order } = loaded;

  const item = order.items.find((i) => i.id === orderItemId);
  if (!item) return { error: "That item isn't part of this order." };

  const target = Math.trunc(newQuantity);
  if (target < 0 || target >= item.quantity) {
    return { error: "Choose a smaller quantity." };
  }

  const removedUnits = item.quantity - target;
  const refundCents = item.priceCentsAtPurchase * removedUnits;

  // Removing the last remaining line is a cancellation, not an edit — route it
  // through the cancel path so the refund and status transition stay correct.
  const isWholeOrder =
    order.items.length === 1 && target === 0;
  if (isWholeOrder) {
    return cancelOrderAction(orderId, undefined, new FormData());
  }

  const isPaid =
    order.paymentStatus === "PAID" || order.paymentStatus === "PARTIALLY_REFUNDED";

  if (isPaid) {
    try {
      await refundOrder(order.id, refundCents);
    } catch (error) {
      if (error instanceof RefundError) return { error: error.message };
      console.error(`Failed to refund item on order ${orderId}`, error);
      return { error: "We couldn't adjust this order. Please contact support." };
    }
  }

  await prisma.$transaction(async (tx) => {
    if (target === 0) {
      await tx.orderItem.delete({ where: { id: item.id } });
    } else {
      await tx.orderItem.update({
        where: { id: item.id },
        data: { quantity: target },
      });
    }

    // refundOrder only restocks on a full refund, so the units removed by a
    // partial adjustment have to be returned to inventory explicitly.
    if (item.listingId) {
      await tx.listing.update({
        where: { id: item.listingId },
        data: { inventoryQty: { increment: removedUnits } },
      });
    }

    // An unpaid order's total isn't backed by a Stripe charge, so it can be
    // recalculated directly; a paid one was already adjusted by refundOrder.
    if (!isPaid) {
      await tx.order.update({
        where: { id: order.id },
        data: {
          subtotalCents: { decrement: refundCents },
          totalCents: { decrement: refundCents },
        },
      });
    }
  });

  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/account/orders");
  return {
    success: isPaid
      ? "Order updated — a refund for the removed items is on its way."
      : "Order updated.",
  };
}
