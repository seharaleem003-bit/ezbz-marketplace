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

export async function addToCartAction(formData: FormData) {
  const listingId = String(formData.get("listingId") ?? "");
  const requestedQuantity = Math.trunc(Number(formData.get("quantity")));
  const quantity = Number.isFinite(requestedQuantity) && requestedQuantity > 0 ? requestedQuantity : 1;
  if (!listingId) return;

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.status !== "PUBLISHED") return;

  const cartId = await resolveOrCreateCartId();

  await prisma.cartItem.upsert({
    where: { cartId_listingId: { cartId, listingId } },
    update: { quantity: { increment: quantity }, priceCentsAtAdd: listing.priceCents },
    create: { cartId, listingId, quantity, priceCentsAtAdd: listing.priceCents },
  });

  revalidateCartViews();
}

export async function updateCartItemQuantityAction(cartItemId: string, quantity: number) {
  const cartId = await getCurrentCartId();
  if (!cartId) return;

  const item = await prisma.cartItem.findUnique({ where: { id: cartItemId } });
  if (!item || item.cartId !== cartId) return;

  const safeQuantity = Math.trunc(quantity);

  if (safeQuantity <= 0) {
    await prisma.cartItem.delete({ where: { id: cartItemId } });
  } else {
    await prisma.cartItem.update({ where: { id: cartItemId }, data: { quantity: safeQuantity } });
  }

  revalidateCartViews();
}

export async function removeCartItemAction(cartItemId: string) {
  const cartId = await getCurrentCartId();
  if (!cartId) return;

  const item = await prisma.cartItem.findUnique({ where: { id: cartItemId } });
  if (!item || item.cartId !== cartId) return;

  await prisma.cartItem.delete({ where: { id: cartItemId } });

  revalidateCartViews();
}
