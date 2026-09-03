"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { createShipmentForOrder, buyLabelForShipment, getShipment } from "@/lib/easyship";

export type ShippingActionState = { error?: string; success?: string } | undefined;

async function loadSellerOrder(orderId: string) {
  const session = await verifySession();
  const seller = await prisma.seller.findUnique({ where: { userId: session.user.id } });
  if (!seller) redirect("/sell");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { listing: { include: { category: true } } } } },
  });
  if (!order || order.sellerId !== seller.id) throw new Error("Order not found");

  return { order, seller };
}

function sellerHasAddress(seller: {
  addressLine1: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  phone: string | null;
}) {
  return Boolean(seller.addressLine1 && seller.city && seller.region && seller.postalCode && seller.phone);
}

export async function createSellerShipmentAction(orderId: string): Promise<ShippingActionState> {
  try {
    const { order, seller } = await loadSellerOrder(orderId);

    if (!sellerHasAddress(seller)) {
      return { error: "Add your shipping address in Settings before creating a shipment." };
    }

    const buyer = await prisma.user.findUnique({ where: { id: order.userId } });

    const shipment = await createShipmentForOrder({
      origin: {
        companyName: seller.displayName,
        contactName: seller.displayName,
        contactEmail: buyer?.email ?? "",
        contactPhone: seller.phone!,
        line1: seller.addressLine1!,
        line2: seller.addressLine2,
        city: seller.city!,
        state: seller.region!,
        postalCode: seller.postalCode!,
        countryAlpha2: seller.country.length === 2 ? seller.country.toUpperCase() : "US",
      },
      destination: {
        contactName: order.shippingName,
        contactEmail: buyer?.email ?? "",
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

    revalidatePath(`/sell/orders/${orderId}`);
    return { success: `Shipment created: ${shipment.easyship_shipment_id}` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create shipment." };
  }
}

export async function buySellerLabelAction(orderId: string): Promise<ShippingActionState> {
  try {
    const { order } = await loadSellerOrder(orderId);
    if (!order.easyshipShipmentId) {
      return { error: "Create a shipment before buying a label." };
    }

    const shipment = await buyLabelForShipment(order.easyshipShipmentId);
    const trackingsList = shipment.trackings as { tracking_number?: string; handler?: string }[] | undefined;
    const trackingNumber = shipment.parcels?.[0]?.tracking_number ?? trackingsList?.[0]?.tracking_number ?? null;
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

    revalidatePath(`/sell/orders/${orderId}`);
    return { success: "Label purchased and tracking saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to buy label." };
  }
}

export async function refreshSellerTrackingAction(orderId: string): Promise<ShippingActionState> {
  try {
    const { order } = await loadSellerOrder(orderId);
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

    revalidatePath(`/sell/orders/${orderId}`);
    return { success: "Tracking refreshed." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to refresh tracking." };
  }
}
