import Link from "next/link";
import Image from "next/image";
import { MessageCircle } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/dal";
import { formatRelativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Messages" };

export default async function AdminMessagesPage() {
  await requireAdmin();

  // EZBZ-direct listings have no seller account, so nobody would otherwise
  // see these threads — this is the platform side of the inbox.
  const conversations = await prisma.conversation.findMany({
    where: { sellerUserId: null },
    orderBy: { updatedAt: "desc" },
    include: {
      listing: {
        select: { title: true, photos: { orderBy: { sortOrder: "asc" }, take: 1 } },
      },
      buyer: { select: { name: true, email: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-heading font-semibold">Messages</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Buyer questions about EZBZ-direct listings. Seller-owned listings go to that
        seller&apos;s own inbox.
      </p>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-card py-16 text-center ring-1 ring-foreground/10">
          <MessageCircle className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No buyer messages yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {conversations.map((conversation) => {
            const last = conversation.messages[0];
            const photo = conversation.listing.photos[0];
            const awaitingReply = Boolean(
              last && last.senderId === conversation.buyerId && last.readAt === null
            );

            return (
              <li key={conversation.id}>
                <Link
                  href={`/account/messages/${conversation.id}`}
                  className="flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 transition-colors hover:bg-muted/50"
                >
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {photo ? (
                      <Image src={photo.url} alt="" fill sizes="48px" className="object-cover" />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate font-medium">
                        {conversation.buyer.name ?? conversation.buyer.email}
                      </p>
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
                      <p className="truncate text-sm text-muted-foreground">{last.body}</p>
                    ) : null}
                  </div>

                  {awaitingReply ? (
                    <span className="shrink-0 rounded-full bg-gold-500 px-2 py-0.5 text-xs font-semibold text-navy-900">
                      Needs reply
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
