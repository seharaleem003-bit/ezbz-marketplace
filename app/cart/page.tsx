import Link from "next/link";
import type { Metadata } from "next";

import { getCart, reconcileCartStock } from "@/lib/cart";
import { formatCents } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n";
import { CartItemRow } from "./cart-item-row";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.cart };
}

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const dict = await getDictionary();
  // Before rendering, not at checkout: a cart can outlive the stock it was
  // filled from, and being told after entering a card is far worse.
  const reduced = await reconcileCartStock();
  const cart = await getCart();
  const items = cart?.items ?? [];
  const subtotalCents = items.reduce(
    (sum, item) => sum + item.listing.priceCents * item.quantity,
    0
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-heading font-semibold">{dict.cart.title}</h1>

      {reduced.length > 0 ? (
        <div
          role="status"
          className="mb-4 rounded-lg bg-gold-500/10 px-4 py-3 text-sm ring-1 ring-gold-500/40"
        >
          <p className="font-medium">Stock has changed since you added these.</p>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">
            {reduced.map((r) => (
              <li key={r.title}>
                {r.title} —{" "}
                {r.to === 0 ? "now out of stock, removed" : `reduced to ${r.to}, all we have`}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-card py-16 text-center ring-1 ring-foreground/10">
          <p className="text-muted-foreground">{dict.cart.empty}</p>
          <Button render={<Link href="/listings" />}>{dict.cart.browseDeals}</Button>
        </div>
      ) : (
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          {items.map((item) => (
            <CartItemRow key={item.id} item={item} />
          ))}

          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">{dict.cart.subtotal}</span>
            <span className="text-lg font-semibold">{formatCents(subtotalCents)}</span>
          </div>

          <Button className="mt-4 w-full" size="lg" render={<Link href="/checkout" />}>
            {dict.cart.checkout}
          </Button>
        </div>
      )}
    </div>
  );
}
