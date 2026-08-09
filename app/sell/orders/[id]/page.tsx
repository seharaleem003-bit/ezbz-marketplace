import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { formatCents } from "@/lib/format";
import { OrderShippingPanel } from "@/components/order-shipping-panel";
import {
  createSellerShipmentAction,
  buySellerLabelAction,
  refreshSellerTrackingAction,
} from "./actions";

export const metadata: Metadata = {
  title: "Order details",
};

export const dynamic = "force-dynamic";

export default async function SellerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await verifySession();
  const seller = await prisma.seller.findUnique({ where: { userId: session.user.id } });
  if (!seller) redirect("/sell");

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order || order.sellerId !== seller.id) notFound();

  const missingAddress = !(
    seller.addressLine1 &&
    seller.city &&
    seller.region &&
    seller.postalCode &&
    seller.phone
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-heading font-semibold">{order.orderNumber}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Placed {order.createdAt.toLocaleDateString()} &middot; {order.status} &middot; {order.paymentStatus}
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
          <span>Your payout</span>
          <span>{formatCents(order.merchantPayoutCents)}</span>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-1 text-sm font-medium">Ship to</h2>
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
          createShipmentAction={createSellerShipmentAction.bind(null, order.id)}
          buyLabelAction={buySellerLabelAction.bind(null, order.id)}
          refreshTrackingAction={refreshSellerTrackingAction.bind(null, order.id)}
          disabledReason={
            missingAddress && !order.easyshipShipmentId ? (
              <>
                Add your <Link href="/sell/settings" className="underline">shipping address</Link> before
                creating a shipment.
              </>
            ) : null
          }
        />
      </div>

      <Link href="/sell/orders" className="mt-4 inline-block text-sm text-muted-foreground underline">
        Back to my sales
      </Link>
    </div>
  );
}
