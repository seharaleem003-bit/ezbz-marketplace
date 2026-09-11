"use server";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentCartId, GUEST_CART_COOKIE } from "@/lib/cart";

async function resolveOrCreateCartId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  const cookieStore = await cookies();

  if (userId) {
    const cart = await prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return cart.id;
  }

  const existingToken = cookieStore.get(GUEST_CART_COOKIE)?.value;
  if (existingToken) {
    const existing = await prisma.cart.findUnique({ where: { guestToken: existingToken } });
    if (existing) return existing.id;
  }

  const guestToken = crypto.randomUUID();
  const cart = await prisma.cart.create({ data: { guestToken } });
  cookieStore.set(GUEST_CART_COOKIE, guestToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return cart.id;
}

function revalidateCartViews() {
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export interface CartQuantityResult {
  /** Set when the request was reduced to what is actually in stock. */
  cappedTo?: number;
  error?: string;
}

/**
 * How many units of a listing a cart may hold.
 *
 * A pre-book is sold before it exists, so its stock count says nothing about
 * what can be ordered — those stay uncapped. Everything else is limited to
 * the quantity the admin has entered, because promising stock that isn't
 * there turns into a refund and an apology at the other end.
 */
function maxOrderable(listing: { inventoryQty: number; isPrebook: boolean }): number | null {
  return listing.isPrebook ? null : Math.max(0, listing.inventoryQty);
}

export async function addToCartAction(formData: FormData): Promise<CartQuantityResult> {
  const listingId = String(formData.get("listingId") ?? "");
  const requestedQuantity = Math.trunc(Number(formData.get("quantity")));
  const quantity = Number.isFinite(requestedQuantity) && requestedQuantity > 0 ? requestedQuantity : 1;
  if (!listingId) return {};

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.status !== "PUBLISHED") return {};

  const cartId = await resolveOrCreateCartId();
  const cap = maxOrderable(listing);

  // Adding is cumulative, so the cap applies to the resulting total rather
  // than to this request on its own — otherwise pressing "Add to cart" five
  // times walks straight past it.
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_listingId: { cartId, listingId } },
    select: { quantity: true },
  });
  const current = existing?.quantity ?? 0;
  const desired = current + quantity;
  const finalQuantity = cap === null ? desired : Math.min(desired, cap);

  if (finalQuantity <= 0) {
    return { error: "That item is out of stock." };
  }

  await prisma.cartItem.upsert({
    where: { cartId_listingId: { cartId, listingId } },
    update: { quantity: finalQuantity, priceCentsAtAdd: listing.priceCents },
    create: { cartId, listingId, quantity: finalQuantity, priceCentsAtAdd: listing.priceCents },
  });

  revalidateCartViews();
  return finalQuantity < desired ? { cappedTo: finalQuantity } : {};
}

export async function updateCartItemQuantityAction(
  cartItemId: string,
  quantity: number
): Promise<CartQuantityResult> {
  const cartId = await getCurrentCartId();
  if (!cartId) return {};

  const item = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: { listing: { select: { inventoryQty: true, isPrebook: true } } },
  });
  if (!item || item.cartId !== cartId) return {};

  const safeQuantity = Math.trunc(quantity);

  if (safeQuantity <= 0) {
    await prisma.cartItem.delete({ where: { id: cartItemId } });
    revalidateCartViews();
    return {};
  }

  // Enforced here rather than only in the UI: the buttons are a convenience,
  // but the quantity that reaches the database is whatever the browser sends.
  const cap = maxOrderable(item.listing);
  const finalQuantity = cap === null ? safeQuantity : Math.min(safeQuantity, cap);

  if (finalQuantity <= 0) {
    await prisma.cartItem.delete({ where: { id: cartItemId } });
    revalidateCartViews();
    return { error: "That item is out of stock." };
  }

  await prisma.cartItem.update({ where: { id: cartItemId }, data: { quantity: finalQuantity } });

  revalidateCartViews();
  return finalQuantity < safeQuantity ? { cappedTo: finalQuantity } : {};
}

export async function removeCartItemAction(cartItemId: string) {
  const cartId = await getCurrentCartId();
  if (!cartId) return;

  const item = await prisma.cartItem.findUnique({ where: { id: cartItemId } });
  if (!item || item.cartId !== cartId) return;

  await prisma.cartItem.delete({ where: { id: cartItemId } });

  revalidateCartViews();
}
