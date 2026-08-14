import "server-only";

import { prisma } from "@/lib/prisma";
import { sendBackInStockEmail } from "@/lib/email";

export interface NotifyResult {
  total: number;
  emailed: number;
  withPhone: number;
  smsSent: number;
}

/**
 * Alerts everyone waiting on a listing that it's now buyable.
 *
 * Only rows with notifiedAt still null are picked up, and each is stamped as
 * it's sent — so re-running this (or flipping a listing on and off) can't
 * email the same person twice.
 */
export async function notifyPrebookWaitlist(listingId: string): Promise<NotifyResult> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, title: true, slug: true },
  });
  if (!listing) return { total: 0, emailed: 0, withPhone: 0, smsSent: 0 };

  const pending = await prisma.prebookNotifyRequest.findMany({
    where: { listingId, notifiedAt: null },
  });

  let emailed = 0;
  let withPhone = 0;

  for (const request of pending) {
    // Claim the row first. A send that fails is logged inside sendSafely and
    // still marked done — retrying the whole batch would spam everyone who
    // already received it.
    const { count } = await prisma.prebookNotifyRequest.updateMany({
      where: { id: request.id, notifiedAt: null },
      data: { notifiedAt: new Date() },
    });
    if (count === 0) continue;

    await sendBackInStockEmail(request.email, listing);
    emailed++;

    if (request.phone) withPhone++;
  }

  // SMS is collected but not yet sent — no provider is configured. Wiring
  // Twilio (or similar) in here is all that's missing; the numbers are stored.
  if (withPhone > 0) {
    console.info(
      `Pre-book release for "${listing.title}": ${withPhone} waitlist entries have a phone number, but no SMS provider is configured — email only.`
    );
  }

  return { total: pending.length, emailed, withPhone, smsSent: 0 };
}
