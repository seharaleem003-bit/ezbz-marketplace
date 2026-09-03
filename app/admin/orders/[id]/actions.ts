"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/dal";
import { createShipmentForOrder, buyLabelForShipment, getShipment, PLATFORM_ORIGIN_ADDRESS } from "@/lib/easyship";

export type ShippingActionState = { error?: string; success?: string } | undefined;

async function loadOrderForShipping(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { listing: { include: { category: true } } } } },
  });
  if (!order) throw new Error("Order not found");
  return order;
}

export async function createShipmentAction(
  orderId: string,
): Promise<ShippingActionState> {
  await requireAdmin();

  try {
    const order = await loadOrderForShipping(orderId);
    const buyer = await prisma.user.findUnique({ where: { id: order.userId } });

    const shipment = await createShipmentForOrder({
      origin: PLATFORM_ORIGIN_ADDRESS,
      destination: {
        contactName: order.shippingName,
        contactEmail: buyer?.email ?? PLATFORM_ORIGIN_ADDRESS.contactEmail,
        line1: order.shippingLine1,
        line2: order.shippingLine2,
        city: order.shippingCity,
        state: order.shippingState,
        postalCode: order.shippingPostal,
        countryName: order.shippingCountry,
      },
      items: order.items.map((item) => ({
        description: item.titleAtPurchase,
        quantity: item.quantity,
        priceCents: item.priceCentsAtPurchase,
        categorySlug: item.listing?.category.slug ?? null,
      })),
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { easyshipShipmentId: shipment.easyship_shipment_id, trackingUrl: shipment.tracking_page_url },
    });

    revalidatePath(`/admin/orders/${orderId}`);
    return { success: `Shipment created: ${shipment.easyship_shipment_id}` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create shipment." };
  }
}

export async function buyLabelAction(
  orderId: string,
): Promise<ShippingActionState> {
  await requireAdmin();

  try {
    const order = await loadOrderForShipping(orderId);
    if (!order.easyshipShipmentId) {
      return { error: "Create a shipment before buying a label." };
    }

    const shipment = await buyLabelForShipment(order.easyshipShipmentId);
    const tracking = shipment.parcels?.[0]?.tracking_number ?? null;
    const trackingsList = shipment.trackings as { tracking_number?: string; handler?: string }[] | undefined;
    const trackingNumber = tracking ?? trackingsList?.[0]?.tracking_number ?? null;
    const carrier = shipment.courier_service?.name ?? trackingsList?.[0]?.handler ?? null;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        trackingNumber,
        carrier,
        trackingUrl: shipment.tracking_page_url ?? order.trackingUrl,
        shippedAt: new Date(),
        status: "SHIPPED",
      },
    });

    revalidatePath(`/admin/orders/${orderId}`);
    return { success: "Label purchased and tracking saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to buy label." };
  }
}

export async function refreshTrackingAction(
  orderId: string,
): Promise<ShippingActionState> {
  await requireAdmin();

  try {
    const order = await loadOrderForShipping(orderId);
    if (!order.easyshipShipmentId) {
      return { error: "No shipment to refresh yet." };
    }

    const shipment = await getShipment(order.easyshipShipmentId);
    const trackingsList = shipment.trackings as { tracking_number?: string; handler?: string }[] | undefined;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        trackingNumber: trackingsList?.[0]?.tracking_number ?? order.trackingNumber,
        carrier: trackingsList?.[0]?.handler ?? order.carrier,
        trackingUrl: shipment.tracking_page_url ?? order.trackingUrl,
        deliveredAt: shipment.delivery_state === "delivered" ? new Date() : order.deliveredAt,
        status: shipment.delivery_state === "delivered" ? "DELIVERED" : order.status,
      },
    });

    revalidatePath(`/admin/orders/${orderId}`);
    return { success: "Tracking refreshed." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to refresh tracking." };
  }
}
