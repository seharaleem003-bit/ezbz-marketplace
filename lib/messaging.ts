import "server-only";

import { prisma } from "@/lib/prisma";
import { sendNewMessageEmail } from "@/lib/email";

/**
 * Canned openers offered as one-tap buttons, the way Facebook Marketplace and
 * Amazon do. They cover the questions sellers get asked constantly, so most
 * buyers never have to type anything.
 */
export const QUICK_MESSAGES = [
  "Is this still available?",
  "What condition is it in?",
  "Would you take a lower offer?",
] as const;

export const QUICK_MESSAGES_ES = [
  "¿Sigue disponible?",
  "¿En qué condición está?",
  "¿Aceptarías una oferta más baja?",
] as const;

/** Who answers a thread about this listing — its seller, or EZBZ if direct. */
export async function resolveRecipient(listingId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      seller: { select: { userId: true, displayName: true } },
    },
  });
  if (!listing || listing.status !== "PUBLISHED") return null;

  return {
    listing,
    // Null means EZBZ-direct inventory — the platform side answers, and the
    // thread shows up in the admin inbox rather than a seller's.
    sellerUserId: listing.seller?.userId ?? null,
    sellerName: listing.seller?.displayName ?? "EZBZ",
  };
}

/**
 * Emails the other side that a message arrived.
 *
 * Only fires when they have no earlier unread message in this thread — a rapid
 * back-and-forth would otherwise send an email per line. Once they open the
 * thread everything is marked read, so the next message notifies again.
 */
export async function notifyNewMessage({
  conversationId,
  senderId,
  body,
}: {
  conversationId: string;
  senderId: string;
  body: string;
}) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      listing: { select: { title: true } },
      buyer: { select: { id: true, name: true, email: true } },
      sellerUser: { select: { id: true, name: true, email: true } },
    },
  });
  if (!conversation) return;

  const senderIsBuyer = conversation.buyerId === senderId;
  const recipient = senderIsBuyer ? conversation.sellerUser : conversation.buyer;
  const sender = senderIsBuyer ? conversation.buyer : conversation.sellerUser;

  // EZBZ-direct threads have no seller account; route those to the ops address.
  const recipientEmail = recipient?.email ?? process.env.ORDER_NOTIFICATION_EMAIL ?? null;
  if (!recipientEmail) return;

  // Count unread excluding the message just written — if they already owe a
  // reply, they've been told once and don't need telling again.
  const alreadyPending = await prisma.message.count({
    where: {
      conversationId,
      senderId,
      readAt: null,
      NOT: { body },
    },
  });
  if (alreadyPending > 0) return;

  await sendNewMessageEmail({
    recipientEmail,
    senderName: sender?.name ?? sender?.email ?? "An EZBZ buyer",
    listingTitle: conversation.listing.title,
    body,
    conversationId,
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.message.count({
    where: {
      readAt: null,
      senderId: { not: userId },
      conversation: {
        OR: [{ buyerId: userId }, { sellerUserId: userId }],
      },
    },
  });
}
