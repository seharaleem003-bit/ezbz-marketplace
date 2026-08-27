import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { verifySession, getOptionalSession } from "@/lib/auth/dal";
import { SELLER_SIGNUP_OPEN } from "@/lib/feature-flags";
import { SellComingSoon } from "./coming-soon";
import { formatCents } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { startConnectOnboardingAction } from "./onboarding/actions";
import { startIdentityVerificationAction } from "./verify/actions";

export const metadata: Metadata = {
  title: "Sell on EZBZ",
};

export const dynamic = "force-dynamic";

export default async function SellDashboardPage() {
  // While signups are closed, /sell is a public "coming soon" page rather than
  // a login wall — checked before verifySession() so visitors aren't bounced to
  // sign-in just to read that the feature isn't open. Sellers already approved
  // keep their dashboard.
  if (!SELLER_SIGNUP_OPEN) {
    const visitorId = (await getOptionalSession())?.user?.id;
    const approved = visitorId
      ? await prisma.seller.findFirst({
          where: { userId: visitorId, status: "APPROVED" },
          select: { id: true },
        })
      : null;
    if (!approved) return <SellComingSoon />;
  }

  const session = await verifySession();
  const seller = await prisma.seller.findUnique({
    where: { userId: session.user.id },
    include: { listings: true },
  });

  if (!seller) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-heading font-semibold">Sell on EZBZ</h1>
        <p className="text-muted-foreground">
          Turn your unsold or surplus items into cash. Apply to become a seller — EZBZ takes a
          flat 15% commission, and your first sale is commission-free.
        </p>
        <Button render={<Link href="/sell/apply" />}>Apply to sell</Button>
      </div>
    );
  }

  if (seller.status === "PENDING") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-heading font-semibold">Application under review</h1>
        <p className="text-muted-foreground">
          Thanks for applying, {seller.displayName}. We&apos;ll email you once it&apos;s approved.
        </p>
      </div>
    );
  }

  if (seller.status === "REJECTED") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-heading font-semibold">Application not approved</h1>
        <p className="text-muted-foreground">
          Your seller application wasn&apos;t approved. Contact support if you have questions.
        </p>
      </div>
    );
  }

  if (seller.status === "SUSPENDED") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-heading font-semibold">Account suspended</h1>
        <p className="text-muted-foreground">
          Your seller account is currently suspended. Contact support for details.
        </p>
      </div>
    );
  }

  // status === APPROVED from here on.
  if (!seller.stripeOnboardingComplete) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-heading font-semibold">Connect your payout account</h1>
        <p className="text-muted-foreground">
          You&apos;re approved to sell on EZBZ! Before you can post listings, connect a Stripe
          payout account so you get paid automatically after each sale.
        </p>
        <form action={startConnectOnboardingAction}>
          <Button type="submit">Connect payouts with Stripe</Button>
        </form>
      </div>
    );
  }

  if (!seller.identityVerifiedAt) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-heading font-semibold">Verify your identity</h1>
        <p className="text-muted-foreground">
          One last step — verify your ID with Stripe Identity. This keeps EZBZ safe for buyers
          and sellers.
        </p>
        <form action={startIdentityVerificationAction}>
          <Button type="submit">Verify identity</Button>
        </form>
      </div>
    );
  }

  const published = seller.listings.filter((listing) => listing.status === "PUBLISHED").length;

  const orders = await prisma.order.findMany({
    where: {
      sellerId: seller.id,
      paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] },
    },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  // Mirrors the reversal math in lib/refund.ts: refunds consume the
  // platformFee+merchantPayout pool first (tax sits outside it), so this is
  // the exact amount that was ever clawed back from this seller via a
  // transfer reversal, not just refundedAmountCents.
  const netEarningsCents = orders.reduce((sum, order) => {
    const splitPool = order.platformFeeCents + order.merchantPayoutCents;
    const merchantReversed =
      Math.min(order.refundedAmountCents, splitPool) - order.refundedPlatformFeeCents;
    return sum + order.merchantPayoutCents - merchantReversed;
  }, 0);

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold">{seller.displayName}</h1>
          <p className="text-sm text-muted-foreground">
            {seller.listings.length} listing{seller.listings.length === 1 ? "" : "s"} ·{" "}
            {published} published
          </p>
        </div>
        <Button render={<Link href="/sell/listings/new" />}>Post a listing</Button>
      </div>

      {!seller.firstSaleUsed ? (
        <div className="mb-6 rounded-xl bg-primary/10 p-4 text-sm text-primary ring-1 ring-primary/20">
          Your first sale is commission-free — EZBZ waives its 15% fee on it automatically.
        </div>
      ) : null}

      {!(seller.addressLine1 && seller.city && seller.region && seller.postalCode && seller.phone) ? (
        <div className="mb-6 rounded-xl bg-secondary/60 p-4 text-sm ring-1 ring-foreground/10">
          Add your{" "}
          <Link href="/sell/settings" className="underline">
            shipping address
          </Link>{" "}
          so you can create shipments and buy labels once you have sales.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-xs text-muted-foreground">Total listings</p>
          <p className="text-xl font-semibold">{seller.listings.length}</p>
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-xs text-muted-foreground">Published</p>
          <p className="text-xl font-semibold">{published}</p>
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-xs text-muted-foreground">Inventory value</p>
          <p className="text-xl font-semibold">
            {formatCents(
              seller.listings.reduce((sum, listing) => sum + listing.priceCents * listing.inventoryQty, 0)
            )}
          </p>
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-xs text-muted-foreground">Sales</p>
          <p className="text-xl font-semibold">{orders.length}</p>
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:col-span-2">
          <p className="text-xs text-muted-foreground">Lifetime earnings (net of refunds)</p>
          <p className="text-xl font-semibold">{formatCents(netEarningsCents)}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button variant="outline" render={<Link href="/sell/listings" />}>
          Manage my listings
        </Button>
        <Button variant="outline" render={<Link href="/sell/orders" />}>
          View my sales
        </Button>
        {/* Seller threads land in the shared inbox — sellerUserId matches
            this account, so /account/messages already shows them. */}
        <Button variant="outline" render={<Link href="/account/messages" />}>
          Buyer messages
        </Button>
        <Button variant="ghost" render={<Link href={`/shops/${seller.id}`} />}>
          View my storefront
        </Button>
        <Button variant="ghost" render={<Link href="/sell/settings" />}>
          Shipping settings
        </Button>
      </div>

      {recentOrders.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-3 font-medium">Recent sales</h2>
          <div className="flex flex-col gap-2">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-lg bg-card p-3 text-sm ring-1 ring-foreground/10"
              >
                <div>
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.items.map((item) => item.titleAtPurchase).join(", ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCents(order.merchantPayoutCents)}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.createdAt.toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
