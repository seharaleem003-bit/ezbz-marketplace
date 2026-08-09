import type { Metadata } from "next";

import { verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/format";
import { getStoreCreditBalanceCents } from "@/lib/store-credit";
import { isCommunityGiver } from "@/lib/community-giver";
import { CommunityGiverBadge } from "@/components/community-giver-badge";
import { CopyLinkButton } from "./copy-link-button";

export const metadata: Metadata = {
  title: "Referrals & store credit",
};

export const dynamic = "force-dynamic";

const REASON_LABELS: Record<string, string> = {
  REFERRAL_BONUS: "Referral bonus",
  REDEEMED_AT_CHECKOUT: "Redeemed at checkout",
  ADMIN_ADJUSTMENT: "Adjustment",
};

export default async function ReferralsPage() {
  const session = await verifySession();

  const [user, transactions, balanceCents, isGiver] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.storeCreditTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    getStoreCreditBalanceCents(session.user.id),
    isCommunityGiver(session.user.id),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const referralLink = `${appUrl}/signup?ref=${user?.referralCode ?? ""}`;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-heading font-semibold">Referrals & store credit</h1>
        {isGiver ? <CommunityGiverBadge /> : null}
      </div>

      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="text-sm text-muted-foreground">Your referral link</p>
        <div className="mt-1.5 flex items-center gap-2">
          <code className="flex-1 truncate rounded-md bg-secondary px-2.5 py-1.5 text-sm">
            {referralLink}
          </code>
          <CopyLinkButton link={referralLink} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Share this link — when someone you refer completes their first purchase, you earn{" "}
          {formatCents(1000)} in store credit.
        </p>
      </div>

      <div className="mt-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="text-sm text-muted-foreground">Store credit balance</p>
        <p className="mt-1 text-2xl font-semibold">{formatCents(balanceCents)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Automatically applied at checkout when you have a balance.
        </p>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-medium">Activity</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No store credit activity yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-foreground/10"
              >
                <div>
                  <p>{REASON_LABELS[tx.reason] ?? tx.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    {tx.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={tx.amountCents >= 0 ? "text-emerald-700 dark:text-emerald-400" : ""}
                >
                  {tx.amountCents >= 0 ? "+" : ""}
                  {formatCents(tx.amountCents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
