import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

import { verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Order confirmed",
};

export const dynamic = "force-dynamic";

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await verifySession();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order || order.userId !== session.user.id) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 py-16 text-center">
      <CheckCircle2 className="size-12 text-emerald-600" />
      <div>
        <h1 className="text-2xl font-heading font-semibold">Order placed</h1>
        <p className="mt-1 text-muted-foreground">
          Order {order.orderNumber}
          {order.paymentStatus === "TEST_MODE" ? " — test mode, no payment was collected." : ""}
        </p>
      </div>

      <div className="w-full rounded-xl bg-card p-4 text-left ring-1 ring-foreground/10">
        <ul className="flex flex-col gap-2 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-2">
              <span className="text-muted-foreground">
                {item.titleAtPurchase} &times; {item.quantity}
              </span>
              <span>{formatCents(item.priceCentsAtPurchase * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t pt-3 font-medium">
          <span>Total</span>
          <span>{formatCents(order.totalCents)}</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Shipping to {order.shippingName}, {order.shippingLine1}
          {order.shippingLine2 ? `, ${order.shippingLine2}` : ""}, {order.shippingCity},{" "}
          {order.shippingState} {order.shippingPostal}, {order.shippingCountry}
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" render={<Link href="/listings" />}>
          Continue shopping
        </Button>
        <Button render={<Link href="/account/orders" />}>View my orders</Button>
      </div>
    </div>
  );
}
