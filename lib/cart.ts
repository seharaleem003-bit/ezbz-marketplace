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
            include: { photos: { orderBy: { sortOrder: "asc" }, take: 1 } },
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
