import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Storefront analytics for the admin dashboard.
 *
 * Revenue only ever counts orders that actually took money — `paymentStatus:
 * PAID` — so unpaid carts, abandoned checkouts and test-mode orders never
 * inflate the numbers. Refunds are subtracted rather than ignored, because a
 * dashboard that shows gross-of-refunds revenue quietly overstates the
 * business.
 */

/** Revenue net of refunds, in cents. */
const NET_REVENUE = {
  paid: { paymentStatus: "PAID" } as const,
};

export interface PeriodStats {
  revenueCents: number;
  orderCount: number;
  /** Percentage change vs the immediately preceding window of equal length. */
  revenueChangePct: number | null;
}

export interface DailyPoint {
  date: string;
  revenueCents: number;
  orderCount: number;
}

export interface TopProduct {
  listingId: string;
  title: string;
  slug: string | null;
  unitsSold: number;
  revenueCents: number;
}

export interface DashboardData {
  today: PeriodStats;
  week: PeriodStats;
  month: PeriodStats;
  allTimeRevenueCents: number;
  /** Average order value across paid orders in the last 30 days. */
  aovCents: number;
  daily: DailyPoint[];
  topProducts: TopProduct[];
  customerCount: number;
  newCustomers30d: number;
  repeatCustomers: number;
  unreadMessageThreads: number;
  pendingOrders: number;
  lowStock: { id: string; title: string; slug: string; inventoryQty: number }[];
}

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daysAgo(n: number) {
  return startOfDay(new Date(Date.now() - n * 24 * 60 * 60 * 1000));
}

/** Paid revenue and order count between two dates, net of refunds. */
async function statsBetween(from: Date, to: Date) {
  const agg = await prisma.order.aggregate({
    where: { ...NET_REVENUE.paid, createdAt: { gte: from, lt: to } },
    _sum: { totalCents: true, refundedAmountCents: true },
    _count: true,
  });
  const gross = agg._sum.totalCents ?? 0;
  const refunded = agg._sum.refundedAmountCents ?? 0;
  return { revenueCents: gross - refunded, orderCount: agg._count };
}

/**
 * A period plus the equivalent window immediately before it, so the dashboard
 * can show direction of travel rather than a bare number.
 */
async function periodWithComparison(days: number): Promise<PeriodStats> {
  const now = new Date();
  const from = days <= 1 ? startOfDay(now) : daysAgo(days);
  const prevFrom = days <= 1 ? daysAgo(1) : daysAgo(days * 2);
  const prevTo = from;

  const [current, previous] = await Promise.all([
    statsBetween(from, now),
    statsBetween(prevFrom, prevTo),
  ]);

  const changePct =
    previous.revenueCents > 0
      ? ((current.revenueCents - previous.revenueCents) / previous.revenueCents) * 100
      : null;

  return { ...current, revenueChangePct: changePct };
}

/** Daily revenue for the last `days` days, gap-filled so the chart has no holes. */
async function dailySeries(days: number): Promise<DailyPoint[]> {
  const from = daysAgo(days - 1);
  const orders = await prisma.order.findMany({
    where: { ...NET_REVENUE.paid, createdAt: { gte: from } },
    select: { createdAt: true, totalCents: true, refundedAmountCents: true },
  });

  const byDay = new Map<string, { revenueCents: number; orderCount: number }>();
  for (let i = 0; i < days; i++) {
    const d = daysAgo(days - 1 - i);
    byDay.set(d.toISOString().slice(0, 10), { revenueCents: 0, orderCount: 0 });
  }
  for (const o of orders) {
    const key = startOfDay(o.createdAt).toISOString().slice(0, 10);
    const bucket = byDay.get(key);
    if (!bucket) continue;
    bucket.revenueCents += o.totalCents - o.refundedAmountCents;
    bucket.orderCount += 1;
  }

  return [...byDay.entries()].map(([date, v]) => ({ date, ...v }));
}

async function topProducts(days: number, limit: number): Promise<TopProduct[]> {
  const items = await prisma.orderItem.findMany({
    where: { order: { ...NET_REVENUE.paid, createdAt: { gte: daysAgo(days) } } },
    select: {
      listingId: true,
      titleAtPurchase: true,
      priceCentsAtPurchase: true,
      quantity: true,
      listing: { select: { slug: true } },
    },
  });

  const byListing = new Map<string, TopProduct>();
  for (const item of items) {
    // A deleted listing leaves its line items behind with a null listingId;
    // group those by the purchased title so the sale still counts.
    const key = item.listingId ?? `deleted:${item.titleAtPurchase}`;
    const existing = byListing.get(key);
    const revenue = item.priceCentsAtPurchase * item.quantity;
    if (existing) {
      existing.unitsSold += item.quantity;
      existing.revenueCents += revenue;
    } else {
      byListing.set(key, {
        listingId: key,
        title: item.titleAtPurchase,
        slug: item.listing?.slug ?? null,
        unitsSold: item.quantity,
        revenueCents: revenue,
      });
    }
  }

  return [...byListing.values()]
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, limit);
}

export async function getDashboardData(): Promise<DashboardData> {
  const [
    today,
    week,
    month,
    allTime,
    daily,
    products,
    customerCount,
    newCustomers30d,
    repeatGroups,
    unreadMessageThreads,
    pendingOrders,
    lowStock,
    monthOrderCount,
  ] = await Promise.all([
    periodWithComparison(1),
    periodWithComparison(7),
    periodWithComparison(30),
    prisma.order.aggregate({
      where: NET_REVENUE.paid,
      _sum: { totalCents: true, refundedAmountCents: true },
    }),
    dailySeries(30),
    topProducts(30, 5),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: daysAgo(30) } } }),
    prisma.order.groupBy({
      by: ["userId"],
      where: NET_REVENUE.paid,
      _count: { _all: true },
    }),
    prisma.conversation.count({ where: { messages: { some: { readAt: null } } } }),
    prisma.order.count({ where: { status: "PLACED", ...NET_REVENUE.paid } }),
    prisma.listing.findMany({
      where: { status: "PUBLISHED", isPrebook: false, inventoryQty: { lt: 3 } },
      select: { id: true, title: true, slug: true, inventoryQty: true },
      orderBy: { inventoryQty: "asc" },
      take: 5,
    }),
    prisma.order.count({ where: { ...NET_REVENUE.paid, createdAt: { gte: daysAgo(30) } } }),
  ]);

  const allTimeRevenueCents =
    (allTime._sum.totalCents ?? 0) - (allTime._sum.refundedAmountCents ?? 0);

  return {
    today,
    week,
    month,
    allTimeRevenueCents,
    aovCents: monthOrderCount > 0 ? Math.round(month.revenueCents / monthOrderCount) : 0,
    daily,
    topProducts: products,
    customerCount,
    newCustomers30d,
    repeatCustomers: repeatGroups.filter((g) => g._count._all > 1).length,
    unreadMessageThreads,
    pendingOrders,
    lowStock,
  };
}

export interface CustomerRow {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: Date;
  orderCount: number;
  totalSpentCents: number;
  lastOrderAt: Date | null;
}

/**
 * Customers ranked by what they've actually spent.
 *
 * Users with no paid orders are included so the list doubles as a signup
 * register — a marketplace this new cares about who registered, not only who
 * converted.
 */
export async function getCustomers(limit = 100): Promise<CustomerRow[]> {
  const users = await prisma.user.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      orders: {
        where: NET_REVENUE.paid,
        select: { totalCents: true, refundedAmountCents: true, createdAt: true },
      },
    },
  });

  return users
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      orderCount: u.orders.length,
      totalSpentCents: u.orders.reduce(
        (sum, o) => sum + o.totalCents - o.refundedAmountCents,
        0
      ),
      lastOrderAt: u.orders.reduce<Date | null>(
        (latest, o) => (!latest || o.createdAt > latest ? o.createdAt : latest),
        null
      ),
    }))
    .sort((a, b) => b.totalSpentCents - a.totalSpentCents);
}
