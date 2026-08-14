import Link from "next/link";
import type { Metadata } from "next";
import { Share2 } from "lucide-react";

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
  SHARE_COMMISSION: "Share reward (2%)",
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

  // Share rewards are just credit rows with this reason, so the lifetime total
  // is a sum over the ledger rather than a separately-maintained counter.
  const shareEarningsCents = transactions
    .filter((tx) => tx.reason === "SHARE_COMMISSION")
    .reduce((sum, tx) => sum + tx.amountCents, 0);

  const shareCount = transactions.filter((tx) => tx.reason === "SHARE_COMMISSION").length;

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

      <div className="mt-4 rounded-xl border border-gold-500/40 bg-gold-500/5 p-4">
        <div className="flex items-start gap-3">
          <Share2 className="mt-0.5 size-5 shrink-0 text-gold-600" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Share any listing, earn 2%</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You don&apos;t need a separate link. Open any listing, hit share, and your
              referral code <code className="rounded bg-secondary px-1 py-0.5 text-xs">
                {user?.referralCode ?? "—"}
              </code>{" "}
              is added to the link automatically. If someone buys through it, 2% of the sale
              lands here as store credit.
            </p>

            <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <div>
                <p className="text-xs text-muted-foreground">Earned from shares</p>
                <p className="text-xl font-semibold text-gold-700 dark:text-gold-400">
                  {formatCents(shareEarningsCents)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sales from your links</p>
                <p className="text-xl font-semibold">{shareCount}</p>
              </div>
            </div>

            <Link
              href="/listings"
              className="mt-3 inline-block text-sm font-medium underline underline-offset-4"
            >
              Find something to share
            </Link>
          </div>
        </div>
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
