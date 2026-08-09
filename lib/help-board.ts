import { prisma } from "@/lib/prisma";

// "Verified Delivered" specifically — CLOSED + deliveredAt means an admin
// confirmed the item actually reached the recipient (see
// markNeedDeliveredAction), not just that its funding goal was met
// (that's the separate FULFILLED status, set in the Stripe webhook).
export async function getDeliveredNeedsCount() {
  return prisma.helpBoardNeed.count({ where: { deliveredAt: { not: null } } });
}
