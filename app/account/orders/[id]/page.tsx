import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/format";

export const metadata: Metadata = {
  title: "Order details",
};

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PLACED: "Placed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default async function AccountOrderDetailPage({
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
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-heading font-semibold">{order.orderNumber}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Placed {order.createdAt.toLocaleDateString()} &middot;{" "}
        {STATUS_LABELS[order.status] ?? order.status}
      </p>

      <div className="mt-6 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
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
      </div>

      <div className="mt-6">
        <h2 className="mb-1 text-sm font-medium">Shipping to</h2>
        <p className="text-sm text-muted-foreground">
          {order.shippingName}
          <br />
          {order.shippingLine1}
          {order.shippingLine2 ? <> {order.shippingLine2}</> : null}
          <br />
          {order.shippingCity}, {order.shippingState} {order.shippingPostal}
          <br />
          {order.shippingCountry}
        </p>
      </div>

      {order.trackingNumber || order.trackingUrl ? (
        <div className="mt-6 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="mb-2 text-sm font-medium">Tracking</h2>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            {order.carrier ? <p>Carrier: {order.carrier}</p> : null}
            {order.trackingNumber ? <p>Tracking number: {order.trackingNumber}</p> : null}
            {order.trackingUrl ? (
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Track this package
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
