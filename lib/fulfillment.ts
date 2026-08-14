import "server-only";
import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { issueReferralBonusIfEligible } from "@/lib/store-credit";
import { sendOrderConfirmationEmail, sendNewOrderNotificationEmail } from "@/lib/email";

/**
 * Settles a paid checkout: marks orders PAID, records the Help Board round-up,
 * transfers merchant payouts, credits share-to-earn, and sends the buyer and
 * merchant emails.
 *
 * Called from two places — the Stripe webhook (authoritative) and the checkout
 * success page (fallback, for when the webhook is delayed or, in local dev,
 * simply can't reach the machine). Every step is idempotent and guarded, so
 * running both is safe: whichever gets there first does the work, the other
 * sees the guards and no-ops.
 */
export async function fulfillCheckoutSession(
  stripe: Stripe,
  checkoutSession: Stripe.Checkout.Session
) {
  const orderIdsRaw = checkoutSession.metadata?.orderIds;
  if (!orderIdsRaw) return;
  const orderIds = orderIdsRaw.split(",").filter(Boolean);
  if (orderIds.length === 0) return;

  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    // seller.user is needed to reach the seller's notification address.
    include: {
      seller: { include: { user: { select: { email: true } } } },
      fundraiser: true,
      items: true,
    },
  });
  if (orders.length === 0) return;

  // Already processed (Stripe can redeliver the same event) — skip.
  if (orders.every((order) => order.paymentStatus === "PAID")) return;

  const totalTaxCents = checkoutSession.total_details?.amount_tax ?? 0;
  const combinedSubtotal = orders.reduce((sum, order) => sum + order.subtotalCents, 0);

  let chargeId: string | undefined;
  if (typeof checkoutSession.payment_intent === "string") {
    const paymentIntent = await stripe.paymentIntents.retrieve(checkoutSession.payment_intent);
    chargeId =
      typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : undefined;
  }

  let newlyPaidCount = 0;

  for (const order of orders) {
    if (order.paymentStatus === "PAID") continue;

    const shareOfTax =
      combinedSubtotal > 0
        ? Math.round((order.subtotalCents / combinedSubtotal) * totalTaxCents)
        : 0;

    // Two callers (webhook + success page) can race, and Stripe itself can
    // deliver the same event twice. Guarding the UPDATE on paymentStatus !=
    // PAID makes the transition atomic — Postgres serializes the writes, so
    // only one matches and returns count 1; the loser skips this order.
    const { count } = await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: { not: "PAID" } },
      data: {
        paymentStatus: "PAID",
        taxCents: shareOfTax,
        // shippingCents is part of what the buyer actually paid, so it has to
        // survive this recompute — it's only non-zero on the first order of a
        // multi-seller checkout.
        totalCents:
          order.subtotalCents +
          shareOfTax +
          order.shippingCents -
          order.storeCreditAppliedCents -
          order.prebookDiscountCents,
        // The PaymentIntent isn't always available when the Checkout Session
        // is first created (see app/checkout/actions.ts) — backfill it here.
        stripePaymentIntentId:
          typeof checkoutSession.payment_intent === "string"
            ? checkoutSession.payment_intent
            : order.stripePaymentIntentId,
      },
    });
    if (count === 0) continue;
    newlyPaidCount++;

    if (order.roundUpCents > 0) {
      await prisma.helpBoardContribution.create({
        data: {
          contributorUserId: order.userId,
          relatedOrderId: order.id,
          amountCents: order.roundUpCents,
          source: "ROUND_UP",
          stripePaymentIntentId:
            typeof checkoutSession.payment_intent === "string"
              ? checkoutSession.payment_intent
              : null,
        },
      });
    }

    const destinationAccountId = order.seller?.stripeAccountId ?? order.fundraiser?.stripeAccountId;
    if (destinationAccountId && order.merchantPayoutCents > 0 && chargeId) {
      try {
        const transfer = await stripe.transfers.create({
          amount: order.merchantPayoutCents,
          currency: "usd",
          destination: destinationAccountId,
          source_transaction: chargeId,
          metadata: { orderId: order.id },
        });
        await prisma.order.update({
          where: { id: order.id },
          data: { stripeTransferId: transfer.id },
        });
      } catch (error) {
        // Payment already succeeded — a failed transfer shouldn't fail the
        // whole flow (that would make Stripe retry a payment that already
        // went through). Log for manual reconciliation instead.
        console.error(`Failed to create payout transfer for order ${order.id}`, error);
      }
    }

    if (order.sellerId) {
      await prisma.seller.update({
        where: { id: order.sellerId },
        data: { firstSaleUsed: true },
      });
    }

    // Tell the merchant they made a sale. Inside the `count === 1` guard, so a
    // duplicate delivery can't notify twice. Seller-fulfilled orders go to the
    // seller; EZBZ-direct inventory goes to the platform's ops address.
    const merchantEmail =
      order.seller?.user?.email ?? process.env.ORDER_NOTIFICATION_EMAIL ?? null;

    if (merchantEmail) {
      await sendNewOrderNotificationEmail({ ...order, items: order.items }, merchantEmail, {
        isPlatformOrder: !order.sellerId,
      });
    } else {
      console.warn(
        `No merchant notification address for order ${order.orderNumber} — set ORDER_NOTIFICATION_EMAIL for EZBZ-direct sales.`
      );
    }

    // Share-to-earn: pay the sharer once the money is actually in. Guarded on
    // shareCommissionPaidAt so a duplicate delivery can't double-credit.
    if (order.shareReferrerUserId && order.shareCommissionCents > 0) {
      const { count: claimed } = await prisma.order.updateMany({
        where: { id: order.id, shareCommissionPaidAt: null },
        data: { shareCommissionPaidAt: new Date() },
      });

      if (claimed === 1) {
        await prisma.storeCreditTransaction.create({
          data: {
            userId: order.shareReferrerUserId,
            amountCents: order.shareCommissionCents,
            reason: "SHARE_COMMISSION",
            relatedOrderId: order.id,
          },
        });
      }
    }

    if (order.storeCreditAppliedCents > 0) {
      await prisma.storeCreditTransaction.create({
        data: {
          userId: order.userId,
          amountCents: -order.storeCreditAppliedCents,
          reason: "REDEEMED_AT_CHECKOUT",
          relatedOrderId: order.id,
        },
      });
    }

    // Sequential by design: this must run after the order above is marked
    // PAID so the "is this the buyer's first paid order" check inside sees
    // sibling orders from the same multi-seller checkout as already settled,
    // and only credits the referrer once per checkout, not once per order.
    await issueReferralBonusIfEligible(order.userId, order.id);
  }

  const buyerId = orders[0]?.userId;
  if (buyerId) {
    await prisma.cartItem.deleteMany({ where: { cart: { userId: buyerId } } });

    // Only the caller that actually won the race for at least one order sends
    // the confirmation — otherwise the loser would email the buyer a second
    // time for work it didn't do.
    if (newlyPaidCount > 0) {
      const buyer = await prisma.user.findUnique({ where: { id: buyerId } });
      if (buyer?.email) {
        // Re-read so the emailed totals reflect the tax/shipping just written.
        const settled = await prisma.order.findMany({
          where: { id: { in: orders.map((o) => o.id) } },
          include: { items: true },
        });
        await sendOrderConfirmationEmail(settled, buyer.email);
      }
    }
  }
}
