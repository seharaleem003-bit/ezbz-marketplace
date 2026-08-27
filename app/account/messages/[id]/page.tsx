import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ReplyForm } from "./reply-form";
import { MessageAttachments } from "@/components/message-attachments";

export const dynamic = "force-dynamic";

export const metadata = { title: "Conversation" };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await verifySession();
  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      listing: {
        select: {
          title: true,
          slug: true,
          priceCents: true,
          photos: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
      },
      buyer: { select: { id: true, name: true, email: true } },
      sellerUser: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { attachments: { orderBy: { createdAt: "asc" } } },
      },
    },
  });

  if (!conversation) notFound();

  // Same access rule as the reply action: participants, plus admins answering
  // EZBZ-direct threads that have no seller on the other side.
  const isParticipant =
    conversation.buyerId === session.user.id ||
    conversation.sellerUserId === session.user.id;
  const isPlatformAgent =
    conversation.sellerUserId === null && session.user.role === "ADMIN";
  if (!isParticipant && !isPlatformAgent) notFound();

  // Anything the other side sent is now seen — marking on open keeps the
  // unread dot in the inbox honest.
  await prisma.message.updateMany({
    where: {
      conversationId: conversation.id,
      senderId: { not: session.user.id },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  const isBuyer = conversation.buyerId === session.user.id;
  const other = isBuyer ? conversation.sellerUser : conversation.buyer;
  const otherName = other?.name ?? other?.email ?? "EZBZ";
  const photo = conversation.listing.photos[0];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
      <Link
        href="/account/messages"
        className="mb-4 flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Messages
      </Link>

      <Link
        href={`/listings/${conversation.listing.slug}`}
        className="mb-4 flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 hover:bg-muted/50"
      >
        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
          {photo ? (
            <Image src={photo.url} alt="" fill sizes="48px" className="object-cover" />
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{conversation.listing.title}</p>
          <p className="text-sm text-muted-foreground">
            {formatCents(conversation.listing.priceCents)}
          </p>
        </div>
      </Link>

      <p className="mb-3 text-sm text-muted-foreground">
        Conversation with <span className="font-medium text-foreground">{otherName}</span>
      </p>

      <ul className="flex flex-col gap-2">
        {conversation.messages.map((message) => {
          const mine = message.senderId === session.user.id;
          return (
            <li
              key={message.id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                  mine
                    ? "rounded-br-sm bg-navy-800 text-white"
                    : "rounded-bl-sm bg-muted text-foreground"
                )}
              >
                {message.body ? (
                  <p className="whitespace-pre-line">{message.body}</p>
                ) : null}
                <MessageAttachments attachments={message.attachments} />
                <p className={cn("mt-1 text-[11px]", mine ? "text-white/60" : "text-muted-foreground")}>
                  {message.createdAt.toLocaleString()}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4">
        <ReplyForm conversationId={conversation.id} />
      </div>
    </div>
  );
}
