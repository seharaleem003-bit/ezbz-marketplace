import "server-only";

import { prisma } from "@/lib/prisma";

// Arbitrary flat bonus per the brief ("store credit... reward" — no amount
// specified). Easy to tune later since every issuance is snapshotted on its
// own ledger row, not a formula re-applied retroactively.
export const REFERRAL_BONUS_CENTS = 1000; // $10

export async function getStoreCreditBalanceCents(userId: string): Promise<number> {
  const result = await prisma.storeCreditTransaction.aggregate({
    where: { userId },
    _sum: { amountCents: true },
  });
  return result._sum.amountCents ?? 0;
}

// Reward the referrer once — on the referred user's first PAID order, not
// at signup, so the bonus reflects a real completed purchase rather than a
// free account creation (lower fraud surface for a program with a real $ payout).
export async function issueReferralBonusIfEligible(buyerId: string, orderId: string) {
  const buyer = await prisma.user.findUnique({ where: { id: buyerId } });
  if (!buyer?.referredByUserId) return;

  const priorPaidOrders = await prisma.order.count({
    where: { userId: buyerId, paymentStatus: "PAID", id: { not: orderId } },
  });
  if (priorPaidOrders > 0) return;

  const alreadyIssued = await prisma.storeCreditTransaction.findFirst({
    where: { reason: "REFERRAL_BONUS", relatedOrderId: orderId },
  });
  if (alreadyIssued) return;

  await prisma.storeCreditTransaction.create({
    data: {
      userId: buyer.referredByUserId,
      amountCents: REFERRAL_BONUS_CENTS,
      reason: "REFERRAL_BONUS",
      relatedOrderId: orderId,
    },
  });
}
