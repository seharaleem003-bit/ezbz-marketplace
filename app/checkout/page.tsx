import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { getCart } from "@/lib/cart";
import { formatCents } from "@/lib/format";
import { getStoreCreditBalanceCents } from "@/lib/store-credit";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = {
  title: "Checkout",
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await verifySession();

  const cart = await getCart();
  const items = cart?.items ?? [];

  if (items.length === 0) {
    redirect("/cart");
  }

  const subtotalCents = items.reduce(
    (sum, item) => sum + item.listing.priceCents * item.quantity,
    0
  );

  const storeCreditCents = await getStoreCreditBalanceCents(session.user.id);
  const allowPickup = items.every((item) => item.listing.fulfillmentPickup);

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-10 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="mb-6 text-2xl font-heading font-semibold">Checkout</h1>
        <CheckoutForm
          storeCreditCents={storeCreditCents}
          allowPickup={allowPickup}
          addresses={addresses}
          subtotalCents={subtotalCents}
        />
      </div>

      <aside className="h-fit rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="mb-3 font-medium">Order summary</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-2">
              <span className="text-muted-foreground">
                {item.listing.title} &times; {item.quantity}
              </span>
              <span>{formatCents(item.listing.priceCents * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t pt-3 font-medium">
          <span>Total</span>
          <span>{formatCents(subtotalCents)}</span>
        </div>
        <Link href="/cart" className="mt-3 block text-xs text-muted-foreground underline">
          Edit cart
        </Link>
      </aside>
    </div>
  );
}
