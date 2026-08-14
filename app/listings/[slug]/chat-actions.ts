"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/auth/dal";
import { resolveRecipient, notifyNewMessage } from "@/lib/messaging";

const messageSchema = z.object({
  listingId: z.string().trim().min(1),
  body: z.string().trim().min(1, "Type a message first").max(2000),
});

export type ChatState =
  | { error?: string; success?: boolean; requiresLogin?: boolean }
  | undefined;

export async function sendListingMessageAction(
  _prevState: ChatState,
  formData: FormData
): Promise<ChatState> {
  const session = await getOptionalSession();
  if (!session?.user) {
    // Messaging needs an identity on both ends — there's nowhere to deliver a
    // reply to an anonymous sender.
    return { requiresLogin: true };
  }

  const parsed = messageSchema.safeParse({
    listingId: formData.get("listingId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Type a message first" };
  }

  const recipient = await resolveRecipient(parsed.data.listingId);
  if (!recipient) return { error: "That listing is no longer available." };

  // A seller messaging their own listing has nobody to talk to.
  if (recipient.sellerUserId && recipient.sellerUserId === session.user.id) {
    return { error: "This is your own listing." };
  }

  const conversation = await prisma.conversation.upsert({
    where: {
      listingId_buyerId: {
        listingId: recipient.listing.id,
        buyerId: session.user.id,
      },
    },
    update: { sellerUserId: recipient.sellerUserId },
    create: {
      listingId: recipient.listing.id,
      buyerId: session.user.id,
      sellerUserId: recipient.sellerUserId,
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: session.user.id,
      body: parsed.data.body,
    },
  });

  // Bumps updatedAt so the thread sorts to the top of both inboxes.
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  await notifyNewMessage({
    conversationId: conversation.id,
    senderId: session.user.id,
    body: parsed.data.body,
  });

  revalidatePath("/account/messages");
  revalidatePath("/admin/messages");
  return { success: true };
}

export async function replyToConversationAction(
  conversationId: string,
  _prevState: ChatState,
  formData: FormData
): Promise<ChatState> {
  const session = await getOptionalSession();
  if (!session?.user) return { requiresLogin: true };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Type a message first" };

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation) return { error: "Conversation not found." };

  // The two participants can always post. Admins can also answer EZBZ-direct
  // threads, which have no seller account on the other end.
  const isParticipant =
    conversation.buyerId === session.user.id ||
    conversation.sellerUserId === session.user.id;
  const isPlatformAgent =
    conversation.sellerUserId === null && session.user.role === "ADMIN";

  if (!isParticipant && !isPlatformAgent) return { error: "Conversation not found." };

  const trimmed = body.slice(0, 2000);

  await prisma.message.create({
    data: { conversationId, senderId: session.user.id, body: trimmed },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  await notifyNewMessage({
    conversationId,
    senderId: session.user.id,
    body: trimmed,
  });

  revalidatePath(`/account/messages/${conversationId}`);
  revalidatePath("/account/messages");
  revalidatePath("/admin/messages");
  return { success: true };
}
