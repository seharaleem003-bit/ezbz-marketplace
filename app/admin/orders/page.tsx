import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefundForm } from "./refund-form";

export const metadata: Metadata = {
  title: "Orders",
};

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true, user: { select: { email: true, name: true } } },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-heading font-semibold">Orders</h1>
      <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Placed</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                    {order.orderNumber}
                  </Link>
                </TableCell>
                <TableCell>{order.user.name ?? order.user.email}</TableCell>
                <TableCell>{order.items.length}</TableCell>
                <TableCell>{formatCents(order.totalCents)}</TableCell>
                <TableCell>{order.status}</TableCell>
                <TableCell>
                  {order.paymentStatus}
                  {order.refundedAmountCents > 0 ? (
                    <span className="block text-xs text-muted-foreground">
                      {formatCents(order.refundedAmountCents)} refunded
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>{order.createdAt.toLocaleDateString()}</TableCell>
                <TableCell>
                  {(order.paymentStatus === "PAID" || order.paymentStatus === "PARTIALLY_REFUNDED") &&
                  order.stripePaymentIntentId ? (
                    <RefundForm
                      orderId={order.id}
                      maxRefundableCents={order.totalCents - order.refundedAmountCents}
                    />
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No orders yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
