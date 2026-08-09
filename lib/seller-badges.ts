import "server-only";

import { prisma } from "@/lib/prisma";

export const BADGE_WINDOW_DAYS = 90;

// "Completed" mirrors the seller-earnings query elsewhere (app/sell/page.tsx)
// — any order that was successfully paid, whether or not later refunded, so
// the refund/dispute rate below has a stable denominator to compare against.
const COMPLETED_PAYMENT_STATUSES = ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] as const;

export type SellerBadgeStats = {
  completedOrders: number;
  refundDisputeRate: number;
  onTimeShipRate: number;
  flagCount: number;
};

function tierFromStats(stats: SellerBadgeStats): "NEW" | "TRUSTED" | "TOP" {
  if (
    stats.completedOrders >= 50 &&
    stats.refundDisputeRate < 0.02 &&
    stats.onTimeShipRate > 0.97 &&
    stats.flagCount === 0
  ) {
    return "TOP";
  }
  if (
    stats.completedOrders >= 10 &&
    stats.refundDisputeRate < 0.05 &&
    stats.onTimeShipRate > 0.9
  ) {
    return "TRUSTED";
  }
  // Default/neutral floor — covers both the literal "New Seller" case
  // (under 5 orders or under 30 days old) and any seller who doesn't meet
  // the Trusted thresholds, so nobody is ever left in an undefined tier.
  return "NEW";
}

export async function computeSellerBadgeStats(
  sellerId: string,
  now: Date
): Promise<SellerBadgeStats> {
  const windowStart = new Date(now.getTime() - BADGE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [orders, seller, flagCount] = await Promise.all([
    prisma.order.findMany({
      where: {
        sellerId,
        paymentStatus: { in: [...COMPLETED_PAYMENT_STATUSES] },
        createdAt: { gte: windowStart },
      },
      select: {
        refundedAmountCents: true,
        disputedAt: true,
        shippingMethod: true,
        shippedAt: true,
        createdAt: true,
      },
    }),
    prisma.seller.findUniqueOrThrow({ where: { id: sellerId }, select: { handlingDays: true } }),
    prisma.sellerFlag.count({ where: { sellerId, createdAt: { gte: windowStart } } }),
  ]);

  const completedOrders = orders.length;
  const refundOrDisputeCount = orders.filter(
    (order) => order.refundedAmountCents > 0 || order.disputedAt !== null
  ).length;
  const refundDisputeRate = completedOrders > 0 ? refundOrDisputeCount / completedOrders : 0;

  // Pickup orders have no shipment to be late on, so only DELIVERY orders
  // count toward the on-time-shipping rate.
  const shippableOrders = orders.filter((order) => order.shippingMethod === "DELIVERY");
  const onTimeCount = shippableOrders.filter((order) => {
    if (!order.shippedAt) return false;
    const deadline = new Date(
      order.createdAt.getTime() + seller.handlingDays * 24 * 60 * 60 * 1000
    );
    return order.shippedAt.getTime() <= deadline.getTime();
  }).length;
  const onTimeShipRate = shippableOrders.length > 0 ? onTimeCount / shippableOrders.length : 1;

  return { completedOrders, refundDisputeRate, onTimeShipRate, flagCount };
}

export async function recalculateSellerBadge(sellerId: string, now: Date = new Date()) {
  const stats = await computeSellerBadgeStats(sellerId, now);
  const tier = tierFromStats(stats);
  await prisma.seller.update({
    where: { id: sellerId },
    data: { badgeTier: tier, badgesCalculatedAt: now },
  });
  return { tier, stats };
}

export async function recalculateAllSellerBadges(now: Date = new Date()) {
  const sellers = await prisma.seller.findMany({
    where: { status: "APPROVED" },
    select: { id: true },
  });

  for (const seller of sellers) {
    await recalculateSellerBadge(seller.id, now);
  }

  return { updated: sellers.length };
}
