import "server-only";

import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendRefundReceiptEmail } from "@/lib/email";

export class RefundError extends Error {}

// Refunds always come out of the buyer's payment first-dollar. The
// commission/payout split only ever applied to the subtotal pool
// (platformFeeCents + merchantPayoutCents === subtotalCents — tax and store
// credit sit outside it), so a refund is deemed to consume that pool first,
// proportionally between platform fee and merchant payout, before any
// remainder (tax) is treated as a plain buyer refund with nothing to reverse
// on the merchant side. This keeps repeated partial refunds on the same
// order consistent without drifting off the true transferred amount.
export async function refundOrder(orderId: string, amountCentsInput?: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new RefundError("Order not found");

  if (order.paymentStatus !== "PAID" && order.paymentStatus !== "PARTIALLY_REFUNDED") {
    throw new RefundError("Order is not in a refundable state");
  }
  if (!order.stripePaymentIntentId) {
    throw new RefundError("Order has no associated payment to refund");
  }

  const maxRefundableCents = order.totalCents - order.refundedAmountCents;
  const amountCents = amountCentsInput ?? maxRefundableCents;
  if (amountCents <= 0 || amountCents > maxRefundableCents) {
    throw new RefundError("Invalid refund amount");
  }

  const stripe = getStripe();
  await stripe.refunds.create({
    payment_intent: order.stripePaymentIntentId,
    amount: amountCents,
  });

  const splitPoolCents = order.platformFeeCents + order.merchantPayoutCents;
  const previousSplitRefunded = Math.min(order.refundedAmountCents, splitPoolCents);
  const newTotalRefunded = order.refundedAmountCents + amountCents;
  const newSplitRefunded = Math.min(newTotalRefunded, splitPoolCents);
  const splitRefundDelta = newSplitRefunded - previousSplitRefunded;

  const platformFeeShareOfDelta =
    splitPoolCents > 0 ? Math.round((splitRefundDelta * order.platformFeeCents) / splitPoolCents) : 0;
  const merchantShareOfDelta = splitRefundDelta - platformFeeShareOfDelta;

  if (merchantShareOfDelta > 0 && order.stripeTransferId) {
    try {
      await stripe.transfers.createReversal(order.stripeTransferId, {
        amount: merchantShareOfDelta,
      });
    } catch (error) {
      // The buyer refund already succeeded — surfacing this as a thrown
      // error would be misleading (the refund did happen). Log for manual
      // reconciliation with the merchant instead.
      console.error(`Failed to reverse transfer for order ${orderId}`, error);
    }
  }

  const isFullRefund = newTotalRefunded >= order.totalCents;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        refundedAmountCents: newTotalRefunded,
        refundedPlatformFeeCents: order.refundedPlatformFeeCents + platformFeeShareOfDelta,
        paymentStatus: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
        status: isFullRefund ? "CANCELLED" : order.status,
      },
    });

    // Only a full refund implies the goods came back — restock inventory.
    // A partial refund (price adjustment, damage credit, etc.) keeps the
    // sale and its inventory decrement intact.
    if (isFullRefund) {
      for (const item of order.items) {
        await tx.listing.update({
          where: { id: item.listingId },
          data: { inventoryQty: { increment: item.quantity } },
        });
      }
    }
  });

  const buyer = await prisma.user.findUnique({ where: { id: order.userId } });
  if (buyer?.email) {
    await sendRefundReceiptEmail(order, buyer.email, amountCents, isFullRefund);
  }

  return { amountCents, isFullRefund };
}
