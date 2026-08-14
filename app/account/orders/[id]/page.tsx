import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { estimateDelivery, formatDeliveryWindow } from "@/lib/delivery-estimate";
import { CalendarClock } from "lucide-react";
import {
  OrderStatusTimeline,
  type OrderStatus,
} from "@/components/order-status-timeline";
import { ManageOrder } from "./manage-order";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.orderDetails };
}

export const dynamic = "force-dynamic";

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await verifySession();
  const { id } = await params;
  const dict = await getDictionary();

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order || order.userId !== session.user.id) {
    notFound();
  }

  const itemsSubtotalCents = order.items.reduce(
    (sum, item) => sum + item.priceCentsAtPurchase * item.quantity,
    0
  );
  const isPickup = order.shippingMethod === "PICKUP";
  const locale = await getLocale();

  // Cancelled orders aren't arriving, and delivered ones already have.
  const showEstimate = order.status !== "CANCELLED" && order.status !== "DELIVERED";
  const estimate = estimateDelivery({
    placedAt: order.createdAt,
    // Real handover time once a seller marks it shipped — transit should be
    // counted from then, not from when the order was placed.
    shippedAt: order.shippedAt,
    confirmedDeliveryAt: order.estimatedDeliveryAt,
    isPickup,
    minDays: order.estimatedDeliveryMinDays,
    maxDays: order.estimatedDeliveryMaxDays,
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-heading font-semibold">{order.orderNumber}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {dict.order.placedOn} {order.createdAt.toLocaleDateString()}
      </p>

      <div className="mt-6">
        <OrderStatusTimeline
          status={order.status as OrderStatus}
          labels={{
            placed: dict.order.statusPlaced,
            processing: dict.order.statusProcessing,
            shipped: dict.order.statusShipped,
            delivered: dict.order.statusDelivered,
            cancelled: dict.order.statusCancelled,
            cancelledNote: dict.order.cancelledNote,
          }}
        />
      </div>

      {showEstimate ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-gold-500/40 bg-gold-500/5 p-4">
          <CalendarClock className="mt-0.5 size-5 shrink-0 text-gold-600" />
          <div>
            <p className="text-sm text-muted-foreground">
              {isPickup ? dict.order.estimatedPickup : dict.order.estimatedDelivery}
            </p>
            <p className="text-lg font-semibold">
              {formatDeliveryWindow(estimate, locale)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {estimate.isCarrierQuote
                ? dict.order.carrierEstimate
                : dict.order.genericEstimate}
            </p>
          </div>
        </div>
      ) : null}

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

        {/* Every component of what was charged, so the total is never a
            number the buyer can't account for. */}
        <div className="mt-3 flex flex-col gap-1.5 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{dict.order.subtotal}</span>
            <span>{formatCents(itemsSubtotalCents)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {isPickup ? dict.order.localPickup : dict.order.shipping}
            </span>
            <span className={order.shippingCents === 0 ? "text-gold-600" : undefined}>
              {order.shippingCents === 0 ? dict.order.free : formatCents(order.shippingCents)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">{dict.order.salesTax}</span>
            <span>{formatCents(order.taxCents)}</span>
          </div>

          {order.roundUpCents > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{dict.order.roundUp}</span>
              <span>{formatCents(order.roundUpCents)}</span>
            </div>
          ) : null}

          {order.prebookDiscountCents > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{dict.order.prebookDiscount}</span>
              <span className="text-gold-600">
                &minus;{formatCents(order.prebookDiscountCents)}
              </span>
            </div>
          ) : null}

          {order.storeCreditAppliedCents > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{dict.order.storeCredit}</span>
              <span className="text-gold-600">
                &minus;{formatCents(order.storeCreditAppliedCents)}
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex justify-between border-t pt-3 font-medium">
          <span>{dict.order.total}</span>
          <span>{formatCents(order.totalCents)}</span>
        </div>
      </div>

      <div className="mt-6 rounded-xl border p-4">
        <h2 className="mb-2 text-sm font-medium">{dict.order.tracking}</h2>
        {order.trackingNumber || order.trackingUrl ? (
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            {order.carrier ? (
              <p>
                {dict.order.carrier}: {order.carrier}
              </p>
            ) : null}
            {order.trackingNumber ? (
              <p>
                {dict.order.trackingNumber}: {order.trackingNumber}
              </p>
            ) : null}
            {order.trackingUrl ? (
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-4"
              >
                {dict.order.trackPackage}
              </a>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{dict.order.noTrackingYet}</p>
        )}
      </div>

      <ManageOrder
        orderId={order.id}
        editable={order.status === "PLACED" || order.status === "PROCESSING"}
        isPickup={isPickup}
        items={order.items.map((item) => ({
          id: item.id,
          title: item.titleAtPurchase,
          quantity: item.quantity,
        }))}
        address={{
          shippingName: order.shippingName,
          shippingLine1: order.shippingLine1,
          shippingLine2: order.shippingLine2,
          shippingCity: order.shippingCity,
          shippingState: order.shippingState,
          shippingPostal: order.shippingPostal,
          shippingCountry: order.shippingCountry,
        }}
        labels={{
          manageOrder: dict.order.manageOrder,
          editableNote: dict.order.editableNote,
          lockedNote: dict.order.lockedNote,
          editAddress: dict.order.editAddress,
          saveAddress: dict.order.saveAddress,
          saving: dict.order.saving,
          cancelEdit: dict.order.cancelEdit,
          cancelOrder: dict.order.cancelOrder,
          cancelling: dict.order.cancelling,
          confirmCancel: dict.order.confirmCancel,
          removeItem: dict.order.removeItem,
          addMoreTitle: dict.order.addMoreTitle,
          addMoreBlurb: dict.order.addMoreBlurb,
          keepShopping: dict.order.keepShopping,
          fullName: dict.order.fullName,
          addressLine1: dict.order.addressLine1,
          addressLine2: dict.order.addressLine2,
          city: dict.order.city,
          state: dict.order.state,
          postalCode: dict.order.postalCode,
          country: dict.order.country,
        }}
      />

      <div className="mt-6">
        <h2 className="mb-1 text-sm font-medium">{dict.order.shippingTo}</h2>
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
    </div>
  );
}
