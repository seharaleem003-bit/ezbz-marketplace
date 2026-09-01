import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { computeSellerBadgeStats, BADGE_WINDOW_DAYS } from "@/lib/seller-badges";
import { SellerTrustBadges } from "@/components/seller-trust-badges";
import { FlagForm } from "./flag-form";
import { RecalculateButton, RemoveFlagButton } from "./seller-actions";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Seller detail",
};

export const dynamic = "force-dynamic";

export default async function AdminSellerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;

  const seller = await prisma.seller.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      flags: {
        orderBy: { createdAt: "desc" },
        include: { createdBy: { select: { name: true, email: true } } },
      },
    },
  });
  if (!seller) notFound();

  const stats = await computeSellerBadgeStats(seller.id, new Date());

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link href="/admin/sellers" className="text-sm text-muted-foreground underline">
        ← Sellers
      </Link>

      <div className="mt-2 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold">{seller.displayName}</h1>
          <p className="text-sm text-muted-foreground">{seller.user.name ?? seller.user.email}</p>
        </div>
        <SellerTrustBadges
          badgeTier={seller.badgeTier}
          identityVerified={seller.stripeOnboardingComplete}
        />
      </div>

      <div className="mb-6 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Trust badge stats (trailing {BADGE_WINDOW_DAYS} days)</h2>
          <RecalculateButton sellerId={seller.id} />
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Completed orders</p>
            <p className="text-lg font-semibold">{stats.completedOrders}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Refund/dispute rate</p>
            <p className="text-lg font-semibold">{(stats.refundDisputeRate * 100).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">On-time shipping</p>
            <p className="text-lg font-semibold">{(stats.onTimeShipRate * 100).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Flags (90d)</p>
            <p className="text-lg font-semibold">{stats.flagCount}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Handling time: {seller.handlingDays} day{seller.handlingDays === 1 ? "" : "s"} (set by
          seller) &middot; Last recalculated:{" "}
          {seller.badgesCalculatedAt ? seller.badgesCalculatedAt.toLocaleString() : "never"}
        </p>
      </div>

      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="mb-3 font-medium">Policy flags</h2>
        {seller.flags.length === 0 ? (
          <p className="mb-4 text-sm text-muted-foreground">No flags on record.</p>
        ) : (
          <ul className="mb-4 flex flex-col gap-2">
            {seller.flags.map((flag) => (
              <li
                key={flag.id}
                className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <div>
                  <p>{flag.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    {flag.createdBy.name ?? flag.createdBy.email} &middot;{" "}
                    {flag.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <RemoveFlagButton sellerId={seller.id} flagId={flag.id} />
              </li>
            ))}
          </ul>
        )}
        <FlagForm sellerId={seller.id} />
      </div>
    </div>
  );
}
