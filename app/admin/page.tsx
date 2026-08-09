import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Admin dashboard",
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [publishedCount, draftCount, archivedCount, orderCount, userCount] = await Promise.all([
    prisma.listing.count({ where: { status: "PUBLISHED" } }),
    prisma.listing.count({ where: { status: "DRAFT" } }),
    prisma.listing.count({ where: { status: "ARCHIVED" } }),
    prisma.order.count(),
    prisma.user.count(),
  ]);

  const stats = [
    { label: "Published listings", value: publishedCount },
    { label: "Draft listings", value: draftCount },
    { label: "Archived listings", value: archivedCount },
    { label: "Orders", value: orderCount },
    { label: "Users", value: userCount },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-heading font-semibold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl bg-card p-4 text-center ring-1 ring-foreground/10"
          >
            <p className="text-2xl font-semibold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
