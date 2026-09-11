import "server-only";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const GUEST_CART_COOKIE = "ezbz_guest_cart";

// Read-only cart resolution — safe to call from Server Components (never
// sets cookies). Mutating helpers that create a cart live in
// app/cart/actions.ts, which only ever runs inside Server Actions where
// setting cookies is allowed.
export async function getCurrentCartId(): Promise<string | null> {
  const session = await auth();
  const userId = session?.user?.id;
  const cookieStore = await cookies();

  if (userId) {
    const cart = await prisma.cart.findUnique({ where: { userId }, select: { id: true } });
    return cart?.id ?? null;
  }

  const guestToken = cookieStore.get(GUEST_CART_COOKIE)?.value;
  if (!guestToken) return null;
  const cart = await prisma.cart.findUnique({ where: { guestToken }, select: { id: true } });
  return cart?.id ?? null;
}

export async function getCart() {
  const cartId = await getCurrentCartId();
  if (!cartId) return null;

  return prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          listing: {
            include: {
              photos: { orderBy: { sortOrder: "asc" }, take: 1 },
              // Needed to price delivery at checkout (see lib/shipping.ts).
              category: { select: { slug: true } },
            },
          },
        },
        orderBy: { id: "asc" },
      },
    },
  });
}

export async function getCartItemCount(): Promise<number> {
  const cart = await getCart();
  if (!cart) return 0;
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

// Called right after a successful sign-in/sign-up (from a Server Action, so
// setting/clearing cookies is allowed here).
export async function mergeGuestCartIntoUser(userId: string) {
  const cookieStore = await cookies();
  const guestToken = cookieStore.get(GUEST_CART_COOKIE)?.value;
  if (!guestToken) return;

  const guestCart = await prisma.cart.findUnique({
    where: { guestToken },
    include: { items: true },
  });
  if (!guestCart) {
    cookieStore.delete(GUEST_CART_COOKIE);
    return;
  }

  const userCart = await prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  for (const item of guestCart.items) {
    await prisma.cartItem.upsert({
      where: { cartId_listingId: { cartId: userCart.id, listingId: item.listingId } },
      update: { quantity: { increment: item.quantity } },
      create: {
        cartId: userCart.id,
        listingId: item.listingId,
        quantity: item.quantity,
        priceCentsAtAdd: item.priceCentsAtAdd,
      },
    });
  }

  await prisma.cart.delete({ where: { id: guestCart.id } });
  cookieStore.delete(GUEST_CART_COOKIE);
}

/**
 * Brings cart quantities back within what is actually in stock.
 *
 * Carts outlive the stock they were filled from: an item added when there
 * were twenty may sit there for a week while the shelf empties, and carts
 * created before quantities were enforced can hold any number at all.
 * Checkout already refuses to oversell, but finding out there is a problem
 * after entering a card is the worst possible moment.
 *
 * Returns the titles it reduced, so the cart page can say what changed rather
 * than silently altering what someone chose. Pre-books are left alone — they
 * are sold before they exist.
 */
export async function reconcileCartStock(): Promise<{ title: string; to: number }[]> {
  const cartId = await getCurrentCartId();
  if (!cartId) return [];

  const items = await prisma.cartItem.findMany({
    where: { cartId },
    include: { listing: { select: { title: true, inventoryQty: true, isPrebook: true } } },
  });

  const changed: { title: string; to: number }[] = [];
  for (const item of items) {
    if (item.listing.isPrebook) continue;
    const cap = Math.max(0, item.listing.inventoryQty);
    if (item.quantity <= cap) continue;

    if (cap === 0) {
      await prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: cap } });
    }
    changed.push({ title: item.listing.title, to: cap });
  }
  return changed;
}
