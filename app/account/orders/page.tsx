import Link from "next/link";
import type { Metadata } from "next";

import { verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "My orders",
};

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PLACED: "Placed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default async function AccountOrdersPage() {
  const session = await verifySession();

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-heading font-semibold">My orders</h1>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-card py-16 text-center ring-1 ring-foreground/10">
          <p className="text-muted-foreground">You haven&apos;t placed any orders yet.</p>
          <Button render={<Link href="/listings" />}>Browse deals</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="flex items-center justify-between rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-shadow hover:shadow-md"
            >
              <div>
                <p className="font-medium">{order.orderNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {order.items.length} item{order.items.length === 1 ? "" : "s"} &middot;{" "}
                  {order.createdAt.toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatCents(order.totalCents)}</p>
                <p className="text-sm text-muted-foreground">
                  {STATUS_LABELS[order.status] ?? order.status}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
