import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, Clock } from "lucide-react";

import { verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Order confirmed",
};

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orders?: string }>;
}) {
  const session = await verifySession();
  const { orders: orderIdsParam } = await searchParams;
  const orderIds = (orderIdsParam ?? "").split(",").filter(Boolean);

  if (orderIds.length === 0) notFound();

  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds }, userId: session.user.id },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });

  if (orders.length === 0) notFound();

  const allPaid = orders.every((order) => order.paymentStatus === "PAID");
  const grandTotalCents = orders.reduce((sum, order) => sum + order.totalCents, 0);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 py-16 text-center">
      {allPaid ? (
        <CheckCircle2 className="size-12 text-emerald-600" />
      ) : (
        <Clock className="size-12 text-muted-foreground" />
      )}
      <div>
        <h1 className="text-2xl font-heading font-semibold">
          {allPaid ? "Order placed" : "Confirming your payment…"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {orders.length > 1
            ? `${orders.length} orders — one per seller in your cart.`
            : `Order ${orders[0].orderNumber}`}
          {!allPaid ? " This usually takes just a few seconds — refresh if it doesn't update." : ""}
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        {orders.map((order) => (
          <div key={order.id} className="rounded-xl bg-card p-4 text-left ring-1 ring-foreground/10">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">{order.orderNumber}</span>
              <span className="text-sm text-muted-foreground">
                {order.paymentStatus === "PAID" ? "Paid" : "Processing"}
              </span>
            </div>
            <ul className="flex flex-col gap-1 text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    {item.titleAtPurchase} &times; {item.quantity}
                  </span>
                  <span>{formatCents(item.priceCentsAtPurchase * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t pt-2 text-sm font-medium">
              <span>Total</span>
              <span>{formatCents(order.totalCents)}</span>
            </div>
          </div>
        ))}
      </div>

      {orders.length > 1 ? (
        <div className="flex w-full justify-between rounded-lg bg-secondary/60 px-4 py-2 text-sm font-medium">
          <span>Grand total</span>
          <span>{formatCents(grandTotalCents)}</span>
        </div>
      ) : null}

      <div className="flex gap-3">
        <Button variant="outline" render={<Link href="/listings" />}>
          Continue shopping
        </Button>
        <Button render={<Link href="/account/orders" />}>View my orders</Button>
      </div>
    </div>
  );
}
