import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, MessageSquare, Package, TriangleAlert } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getDashboardData } from "@/lib/analytics";
import { formatCents } from "@/lib/format";
import { RevenueChart } from "./revenue-chart";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Admin dashboard",
};

export const dynamic = "force-dynamic";

function ChangeBadge({ pct }: { pct: number | null }) {
  // No prior revenue to compare against reads as "new", not as +100%.
  if (pct === null) {
    return <span className="text-xs text-muted-foreground">no prior data</span>;
  }
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        up ? "text-green-700" : "text-red-700"
      }`}
    >
      <Icon className="size-3" />
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  change,
}: {
  label: string;
  value: string;
  sub?: string;
  change?: number | null;
}) {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {change !== undefined ? <ChangeBadge pct={change} /> : null}
        {sub ? <span className="text-xs text-muted-foreground">{sub}</span> : null}
      </div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [data, publishedCount, draftCount, recentOrders] = await Promise.all([
    getDashboardData(),
    prisma.listing.count({ where: { status: "PUBLISHED" } }),
    prisma.listing.count({ where: { status: "DRAFT" } }),
    prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        totalCents: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold">Dashboard</h1>
        <Link
          href="/admin/listings/new"
          className="rounded-full bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
        >
          Add listing
        </Link>
      </div>

      {/* Earnings — the numbers asked for first, so they lead. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Today"
          value={formatCents(data.today.revenueCents)}
          sub={`${data.today.orderCount} orders`}
          change={data.today.revenueChangePct}
        />
        <StatCard
          label="Last 7 days"
          value={formatCents(data.week.revenueCents)}
          sub={`${data.week.orderCount} orders`}
          change={data.week.revenueChangePct}
        />
        <StatCard
          label="Last 30 days"
          value={formatCents(data.month.revenueCents)}
          sub={`${data.month.orderCount} orders`}
          change={data.month.revenueChangePct}
        />
        <StatCard
          label="All time"
          value={formatCents(data.allTimeRevenueCents)}
          sub={`avg order ${formatCents(data.aovCents)}`}
        />
      </div>

      <RevenueChart daily={data.daily} />

      {/* Things that need a human — surfaced rather than buried in a subpage. */}
      {data.pendingOrders > 0 || data.unreadMessageThreads > 0 || data.lowStock.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {data.pendingOrders > 0 ? (
            <Link
              href="/admin/orders"
              className="flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 hover:ring-navy-800/40"
            >
              <Package className="size-5 shrink-0 text-navy-800" />
              <span className="text-sm">
                <strong>{data.pendingOrders}</strong> order
                {data.pendingOrders === 1 ? "" : "s"} to fulfil
              </span>
            </Link>
          ) : null}
          {data.unreadMessageThreads > 0 ? (
            <Link
              href="/admin/messages"
              className="flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 hover:ring-navy-800/40"
            >
              <MessageSquare className="size-5 shrink-0 text-navy-800" />
              <span className="text-sm">
                <strong>{data.unreadMessageThreads}</strong> unread message thread
                {data.unreadMessageThreads === 1 ? "" : "s"}
              </span>
            </Link>
          ) : null}
          {data.lowStock.length > 0 ? (
            <Link
              href="/admin/listings"
              className="flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 hover:ring-navy-800/40"
            >
              <TriangleAlert className="size-5 shrink-0 text-gold-600" />
              <span className="text-sm">
                <strong>{data.lowStock.length}</strong> listing
                {data.lowStock.length === 1 ? "" : "s"} low on stock
              </span>
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Best sellers */}
        <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <h2 className="mb-3 font-heading text-lg font-semibold">Best sellers — 30 days</h2>
          {data.topProducts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No sales yet.</p>
          ) : (
            <ol className="space-y-2">
              {data.topProducts.map((p, i) => (
                <li key={p.listingId} className="flex items-center gap-3 text-sm">
                  <span className="w-4 shrink-0 text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {p.slug ? (
                      <Link href={`/listings/${p.slug}`} className="hover:underline">
                        {p.title}
                      </Link>
                    ) : (
                      p.title
                    )}
                  </span>
                  <span className="shrink-0 text-muted-foreground">{p.unitsSold}×</span>
                  <span className="shrink-0 font-medium">{formatCents(p.revenueCents)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Customers */}
        <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-heading text-lg font-semibold">Customers</h2>
            <Link href="/admin/customers" className="text-sm text-navy-800 hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-heading text-xl font-bold">{data.customerCount}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div>
              <p className="font-heading text-xl font-bold">{data.newCustomers30d}</p>
              <p className="text-xs text-muted-foreground">New (30d)</p>
            </div>
            <div>
              <p className="font-heading text-xl font-bold">{data.repeatCustomers}</p>
              <p className="text-xs text-muted-foreground">Repeat buyers</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-center">
            <div>
              <p className="font-heading text-xl font-bold">{publishedCount}</p>
              <p className="text-xs text-muted-foreground">Published listings</p>
            </div>
            <div>
              <p className="font-heading text-xl font-bold">{draftCount}</p>
              <p className="text-xs text-muted-foreground">Drafts</p>
            </div>
          </div>
        </section>
      </div>

      {/* Recent orders */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-heading text-lg font-semibold">Recent orders</h2>
          <Link href="/admin/orders" className="text-sm text-navy-800 hover:underline">
            View all
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Order</th>
                  <th className="py-2 pr-3 font-medium">Customer</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Payment</th>
                  <th className="py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                        #{o.orderNumber}
                      </Link>
                    </td>
                    <td className="max-w-[14rem] truncate py-2 pr-3 text-muted-foreground">
                      {o.user.name ?? o.user.email ?? "—"}
                    </td>
                    <td className="py-2 pr-3">{o.status}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={
                          o.paymentStatus === "PAID"
                            ? "text-green-700"
                            : "text-muted-foreground"
                        }
                      >
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td className="py-2 text-right font-medium">{formatCents(o.totalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
