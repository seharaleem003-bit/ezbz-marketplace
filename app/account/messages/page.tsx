import Link from "next/link";
import Image from "next/image";
import { MessageCircle } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { formatRelativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const session = await verifySession();

  // A user can be on either side of a thread, so both roles are matched here.
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ buyerId: session.user.id }, { sellerUserId: session.user.id }],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      listing: {
        select: {
          title: true,
          slug: true,
          photos: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
      },
      buyer: { select: { id: true, name: true, email: true } },
      sellerUser: { select: { id: true, name: true, email: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (conversations.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
        <MessageCircle className="size-10 text-muted-foreground" />
        <h1 className="text-2xl font-heading font-semibold">No messages yet</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          When you chat with a seller about a listing, the conversation shows up here.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-heading font-semibold">Messages</h1>

      <ul className="flex flex-col gap-2">
        {conversations.map((conversation) => {
          const isBuyer = conversation.buyerId === session.user.id;
          const other = isBuyer ? conversation.sellerUser : conversation.buyer;
          const otherName = other?.name ?? other?.email ?? "EZBZ";
          const last = conversation.messages[0];
          const photo = conversation.listing.photos[0];

          const hasUnread = Boolean(
            last && last.senderId !== session.user.id && last.readAt === null
          );

          return (
            <li key={conversation.id}>
              <Link
                href={`/account/messages/${conversation.id}`}
                className="flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 transition-colors hover:bg-muted/50"
              >
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {photo ? (
                    <Image
                      src={photo.url}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-medium">{otherName}</p>
                    {last ? (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatRelativeTime(last.createdAt)}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {conversation.listing.title}
                  </p>
                  {last ? (
                    <p
                      className={
                        hasUnread
                          ? "truncate text-sm font-medium"
                          : "truncate text-sm text-muted-foreground"
                      }
                    >
                      {last.senderId === session.user.id ? "You: " : ""}
                      {last.body}
                    </p>
                  ) : null}
                </div>

                {hasUnread ? (
                  <span className="size-2.5 shrink-0 rounded-full bg-gold-500" />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
