import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { formatCents } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "My sales",
};

export const dynamic = "force-dynamic";

const PAYMENT_LABELS: Record<string, string> = {
  TEST_MODE: "Test",
  PENDING: "Pending",
  PAID: "Paid",
  PARTIALLY_REFUNDED: "Partially refunded",
  REFUNDED: "Refunded",
  FAILED: "Failed",
};

export default async function SellerOrdersPage() {
  const session = await verifySession();
  const seller = await prisma.seller.findUnique({ where: { userId: session.user.id } });
  if (!seller) redirect("/sell");

  const orders = await prisma.order.findMany({
    where: { sellerId: seller.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  const missingAddress = !(
    seller.addressLine1 &&
    seller.city &&
    seller.region &&
    seller.postalCode &&
    seller.phone
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-heading font-semibold">My sales</h1>

      {missingAddress ? (
        <div className="mb-6 rounded-xl bg-primary/10 p-4 text-sm text-primary ring-1 ring-primary/20">
          Add your{" "}
          <Link href="/sell/settings" className="underline">
            shipping address
          </Link>{" "}
          to start creating shipments and buying labels for these orders.
        </div>
      ) : null}

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-card py-16 text-center ring-1 ring-foreground/10">
          <p className="text-muted-foreground">No sales yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Sale price</TableHead>
                <TableHead>Your payout</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Shipping</TableHead>
                <TableHead>Placed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    <Link href={`/sell/orders/${order.id}`} className="hover:underline">
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {order.items.map((item) => item.titleAtPurchase).join(", ")}
                  </TableCell>
                  <TableCell>{formatCents(order.subtotalCents)}</TableCell>
                  <TableCell>{formatCents(order.merchantPayoutCents)}</TableCell>
                  <TableCell>
                    {PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}
                    {order.commissionBps === 0 ? (
                      <span className="ml-1.5 text-xs text-primary">first sale free</span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {order.trackingNumber
                      ? "Shipped"
                      : order.easyshipShipmentId
                        ? "Ready to ship"
                        : "Not started"}
                  </TableCell>
                  <TableCell>{order.createdAt.toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Link href="/sell" className="mt-4 inline-block text-sm text-muted-foreground underline">
        Back to dashboard
      </Link>
    </div>
  );
}
