import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/format";
import { OrderShippingPanel } from "@/components/order-shipping-panel";
import { createShipmentAction, buyLabelAction, refreshTrackingAction } from "./actions";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Order details",
};

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, user: { select: { name: true, email: true } } },
  });

  if (!order) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-2xl font-heading font-semibold">{order.orderNumber}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {order.user.name ?? order.user.email} &middot; Placed {order.createdAt.toLocaleDateString()} &middot;{" "}
        {order.status} &middot; {order.paymentStatus}
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

      <div className="mt-6 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="mb-3 text-sm font-medium">Shipping & tracking</h2>
        <OrderShippingPanel
          easyshipShipmentId={order.easyshipShipmentId}
          trackingNumber={order.trackingNumber}
          carrier={order.carrier}
          trackingUrl={order.trackingUrl}
          createShipmentAction={createShipmentAction.bind(null, order.id)}
          buyLabelAction={buyLabelAction.bind(null, order.id)}
          refreshTrackingAction={refreshTrackingAction.bind(null, order.id)}
        />
      </div>
    </div>
  );
}
