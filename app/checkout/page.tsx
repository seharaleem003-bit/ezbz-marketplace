import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { getCart } from "@/lib/cart";
import { formatCents } from "@/lib/format";
import { getStoreCreditBalanceCents } from "@/lib/store-credit";
import { getCrossSellListings } from "@/lib/listings";
import { quoteShipping } from "@/lib/shipping";
import { totalPrebookDiscount } from "@/lib/prebook";
import { FreeShippingMeter } from "@/components/free-shipping-meter";
import { CrossSellPanel } from "@/components/cross-sell-panel";
import { getDictionary } from "@/lib/i18n";
import { CheckoutForm } from "./checkout-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.checkout };
}

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await verifySession();
  const dict = await getDictionary();

  const cart = await getCart();
  const items = cart?.items ?? [];

  if (items.length === 0) {
    redirect("/cart");
  }

  const subtotalCents = items.reduce(
    (sum, item) => sum + item.listing.priceCents * item.quantity,
    0
  );

  const prebookDiscountCents = totalPrebookDiscount(
    items.map((item) => ({
      isPrebook: item.listing.isPrebook,
      priceCents: item.listing.priceCents,
      quantity: item.quantity,
    }))
  );

  const storeCreditCents = await getStoreCreditBalanceCents(session.user.id);
  const allowPickup = items.every((item) => item.listing.fulfillmentPickup);

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  // Quoted without a destination here — the buyer hasn't committed to an
  // address yet, so this shows the free-shipping status and a baseline rate.
  // The final charge is re-quoted server-side at checkout (see actions.ts).
  const shipping = await quoteShipping({
    items: items.map((item) => ({
      title: item.listing.title,
      quantity: item.quantity,
      priceCents: item.listing.priceCents,
      categorySlug: item.listing.category?.slug ?? null,
      weightGrams: item.listing.weightGrams,
      lengthCm: item.listing.lengthCm,
      widthCm: item.listing.widthCm,
      heightCm: item.listing.heightCm,
    })),
    subtotalCents,
  });

  const crossSell = await getCrossSellListings({
    excludeListingIds: items.map((item) => item.listingId),
    categoryIds: [...new Set(items.map((item) => item.listing.categoryId))],
    remainingForFreeCents: shipping.remainingForFreeCents,
  });

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-10 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="mb-6 text-2xl font-heading font-semibold">{dict.checkout.title}</h1>
        <CheckoutForm
          storeCreditCents={storeCreditCents}
          allowPickup={allowPickup}
          addresses={addresses}
          subtotalCents={subtotalCents}
        />
        <CrossSellPanel
          items={crossSell}
          remainingForFreeCents={shipping.remainingForFreeCents}
          labels={{
            heading: dict.checkout.boughtTogether,
            nudge: dict.checkout.boughtTogetherNudge,
            generic: dict.checkout.boughtTogetherGeneric,
            unlocksFreeShipping: dict.checkout.unlocksFreeShipping,
            add: dict.checkout.add,
            adding: dict.checkout.adding,
            addedToOrder: dict.checkout.addedToOrder,
          }}
        />
      </div>

      <aside className="h-fit rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="mb-3 font-medium">{dict.checkout.orderSummary}</h2>
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
        <div className="mt-3 flex flex-col gap-1.5 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{dict.checkout.subtotal}</span>
            <span>{formatCents(subtotalCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{dict.checkout.shipping}</span>
            <span className={shipping.shippingCents === 0 ? "font-medium text-gold-600" : ""}>
              {shipping.shippingCents === 0
                ? dict.checkout.free
                : formatCents(shipping.shippingCents)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{shipping.label}</p>
          {prebookDiscountCents > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{dict.order.prebookDiscount}</span>
              <span className="font-medium text-gold-600">
                &minus;{formatCents(prebookDiscountCents)}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-muted-foreground">{dict.order.salesTax}</span>
            {/* Stripe Tax computes the exact amount from the confirmed
                address on its own checkout page, so there's no final figure
                to show here yet. */}
            <span className="text-muted-foreground">{dict.checkout.taxAtPayment}</span>
          </div>
        </div>

        <div className="mt-3 flex justify-between border-t pt-3 font-medium">
          <span>{dict.checkout.total}</span>
          <span>
            {formatCents(subtotalCents + shipping.shippingCents - prebookDiscountCents)}
          </span>
        </div>

        <div className="mt-4">
          <FreeShippingMeter
            subtotalCents={subtotalCents}
            remainingForFreeCents={shipping.remainingForFreeCents}
            labels={{
              unlocked: dict.checkout.freeShippingUnlocked,
              deliveryOnUs: dict.checkout.deliveryOnUs,
              addMorePrefix: dict.checkout.addMorePrefix,
              addMoreSuffix: dict.checkout.addMoreSuffix,
              freeShipping: dict.checkout.freeShipping,
              progressLabel: dict.checkout.freeShippingProgress,
            }}
          />
        </div>

        <Link href="/cart" className="mt-3 block text-xs text-muted-foreground underline">
          {dict.checkout.editCart}
        </Link>
      </aside>
    </div>
  );
}
