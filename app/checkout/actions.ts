"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { verifySession } from "@/lib/auth/dal";
import { getCurrentCartId } from "@/lib/cart";
import { checkoutSchema, shippingMethodOnlySchema, type ResolvedShipping } from "@/lib/validation/checkout";
import { addressSchema } from "@/lib/validation/address";
import { resolveCommissionBps, splitAmountCents } from "@/lib/commission";
import { getStoreCreditBalanceCents } from "@/lib/store-credit";

export type CheckoutActionState = { error?: string } | undefined;

function generateOrderNumber() {
  return `EZBZ-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
}

// Cart items grouped by who gets paid: a real Seller, a Fundraiser, or
// neither (EZBZ-direct inventory, keyed "DIRECT"). One Stripe Checkout
// Session covers the whole cart ("buyer pays once"); one Order is created
// per merchant group, and payouts are transferred per-Order in the webhook.
type MerchantKey = string;

function merchantKeyFor(listing: { sellerId: string | null; fundraiserId: string | null }): MerchantKey {
  if (listing.sellerId) return `seller:${listing.sellerId}`;
  if (listing.fundraiserId) return `fundraiser:${listing.fundraiserId}`;
  return "DIRECT";
}

async function ensureStripeCustomer(userId: string, email: string, name?: string | null) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.stripeCustomerId) return user.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { userId },
  });

  await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

export async function placeOrderAction(
  _prevState: CheckoutActionState,
  formData: FormData
): Promise<CheckoutActionState> {
  const session = await verifySession();

  const addressChoice = formData.get("addressChoice");
  let shipping: ResolvedShipping;
  let shippingMethod: "DELIVERY" | "PICKUP";
  let saveNewAddress: { setDefault: boolean } | null = null;

  if (typeof addressChoice === "string" && addressChoice !== "new" && addressChoice !== "") {
    const savedAddress = await prisma.address.findUnique({ where: { id: addressChoice } });
    if (!savedAddress || savedAddress.userId !== session.user.id) {
      return { error: "That saved address couldn't be found. Please pick another." };
    }
    const methodParsed = shippingMethodOnlySchema.safeParse({
      shippingMethod: formData.get("shippingMethod"),
    });
    if (!methodParsed.success) {
      return { error: "Please choose a fulfillment method." };
    }
    shipping = {
      shippingName: savedAddress.fullName,
      shippingLine1: savedAddress.line1,
      shippingLine2: savedAddress.line2,
      shippingCity: savedAddress.city,
      shippingState: savedAddress.state,
      shippingPostal: savedAddress.postalCode,
      shippingCountry: savedAddress.country,
    };
    shippingMethod = methodParsed.data.shippingMethod;
  } else {
    const parsed = checkoutSchema.safeParse({
      shippingName: formData.get("shippingName"),
      shippingLine1: formData.get("shippingLine1"),
      shippingLine2: formData.get("shippingLine2"),
      shippingCity: formData.get("shippingCity"),
      shippingState: formData.get("shippingState"),
      shippingPostal: formData.get("shippingPostal"),
      shippingCountry: formData.get("shippingCountry"),
      shippingMethod: formData.get("shippingMethod"),
    });

    if (!parsed.success) {
      return { error: "Please fill in all required shipping fields." };
    }
    shipping = {
      shippingName: parsed.data.shippingName,
      shippingLine1: parsed.data.shippingLine1,
      shippingLine2: parsed.data.shippingLine2 || null,
      shippingCity: parsed.data.shippingCity,
      shippingState: parsed.data.shippingState,
      shippingPostal: parsed.data.shippingPostal,
      shippingCountry: parsed.data.shippingCountry,
    };
    shippingMethod = parsed.data.shippingMethod;

    if (formData.get("saveAddress") === "on") {
      saveNewAddress = { setDefault: formData.get("setDefaultAddress") === "on" };
    }
  }

  const cartId = await getCurrentCartId();
  if (!cartId) {
    return { error: "Your cart is empty." };
  }

  const applyStoreCredit = formData.get("applyStoreCredit") === "on";
  const availableCreditCents = applyStoreCredit
    ? await getStoreCreditBalanceCents(session.user.id)
    : 0;
  const applyRoundUp = formData.get("roundUpForGood") === "on";

  let orderIds: string[];
  let totalCreditAppliedCents = 0;
  let roundUpCents = 0;

  try {
    orderIds = await prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { id: cartId },
        include: {
          items: { include: { listing: { include: { seller: true, fundraiser: true } } } },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new Error("EMPTY_CART");
      }

      const groups = new Map<
        MerchantKey,
        {
          sellerId: string | null;
          fundraiserId: string | null;
          sellerFirstSaleUsed?: boolean;
          fundraiserCommissionBps?: number | null;
          items: { listingId: string; title: string; priceCents: number; quantity: number }[];
        }
      >();

      // Re-validate every item against live listing data and decrement
      // stock now — the cart only holds a price snapshot from when it was
      // added, which may be stale. Stock is restored if payment fails
      // (see the webhook handler's payment_intent.payment_failed case).
      for (const item of cart.items) {
        if (item.listing.status !== "PUBLISHED") {
          throw new Error(`UNAVAILABLE:${item.listing.title}`);
        }
        if (shippingMethod === "PICKUP" && !item.listing.fulfillmentPickup) {
          throw new Error(`NO_PICKUP:${item.listing.title}`);
        }

        const decremented = await tx.listing.updateMany({
          where: { id: item.listingId, inventoryQty: { gte: item.quantity } },
          data: { inventoryQty: { decrement: item.quantity } },
        });
        if (decremented.count === 0) {
          throw new Error(`OUT_OF_STOCK:${item.listing.title}`);
        }

        const key = merchantKeyFor(item.listing);
        const group = groups.get(key) ?? {
          sellerId: item.listing.sellerId,
          fundraiserId: item.listing.fundraiserId,
          sellerFirstSaleUsed: item.listing.seller?.firstSaleUsed,
          fundraiserCommissionBps: item.listing.fundraiser?.commissionBps,
          items: [],
        };
        group.items.push({
          listingId: item.listingId,
          title: item.listing.title,
          priceCents: item.listing.priceCents,
          quantity: item.quantity,
        });
        groups.set(key, group);
      }

      const groupList = Array.from(groups.values());
      const groupSubtotals = groupList.map((group) =>
        group.items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0)
      );
      const combinedSubtotal = groupSubtotals.reduce((sum, s) => sum + s, 0);
      // Stripe requires a non-zero payable amount, so never let credit fully
      // zero out the checkout — leave at least $0.50 due.
      const maxApplicable = Math.max(0, combinedSubtotal - 50);
      const creditToApply = Math.min(availableCreditCents, maxApplicable);

      // "Round up for Help Board" — rounds the post-credit subtotal up to the
      // next whole dollar (0 if it's already exact). Goes entirely to Help
      // Board, not split with any seller — see the Stripe line-item comment
      // below for how that's kept out of the marketplace split accounting.
      const amountAfterCredit = combinedSubtotal - creditToApply;
      roundUpCents = applyRoundUp ? (100 - (amountAfterCredit % 100)) % 100 : 0;

      const createdOrderIds: string[] = [];
      let creditRemaining = creditToApply;

      for (let i = 0; i < groupList.length; i++) {
        const group = groupList[i];
        const subtotalCents = groupSubtotals[i];
        const isLastGroup = i === groupList.length - 1;

        // Proportional split by subtotal share; the last group absorbs any
        // rounding remainder so the total applied exactly equals creditToApply.
        const creditForGroup = isLastGroup
          ? creditRemaining
          : combinedSubtotal > 0
            ? Math.min(
                creditRemaining,
                Math.round((subtotalCents / combinedSubtotal) * creditToApply)
              )
            : 0;
        creditRemaining -= creditForGroup;

        const commissionBps = resolveCommissionBps({
          fundraiserCommissionBps: group.fundraiserCommissionBps,
          sellerFirstSaleUsed: group.sellerFirstSaleUsed,
        });
        const { platformFeeCents, merchantPayoutCents } = splitAmountCents(
          subtotalCents,
          commissionBps
        );

        const order = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            userId: session.user.id,
            sellerId: group.sellerId,
            fundraiserId: group.fundraiserId,
            paymentStatus: "PENDING",
            subtotalCents,
            storeCreditAppliedCents: creditForGroup,
            roundUpCents: i === 0 ? roundUpCents : 0,
            totalCents: subtotalCents - creditForGroup,
            commissionBps,
            platformFeeCents,
            merchantPayoutCents,
            shippingMethod,
            shippingName: shipping.shippingName,
            shippingLine1: shipping.shippingLine1,
            shippingLine2: shipping.shippingLine2,
            shippingCity: shipping.shippingCity,
            shippingState: shipping.shippingState,
            shippingPostal: shipping.shippingPostal,
            shippingCountry: shipping.shippingCountry,
            items: {
              create: group.items.map((item) => ({
                listingId: item.listingId,
                titleAtPurchase: item.title,
                priceCentsAtPurchase: item.priceCents,
                quantity: item.quantity,
              })),
            },
          },
        });

        createdOrderIds.push(order.id);
      }

      totalCreditAppliedCents = creditToApply;
      return createdOrderIds;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message.startsWith("OUT_OF_STOCK:")) {
      return { error: `Sorry, "${message.split(":")[1]}" no longer has enough stock.` };
    }
    if (message.startsWith("UNAVAILABLE:")) {
      return { error: `"${message.split(":")[1]}" is no longer available.` };
    }
    if (message.startsWith("NO_PICKUP:")) {
      return { error: `"${message.split(":")[1]}" doesn't support local pickup.` };
    }
    if (message === "EMPTY_CART") {
      return { error: "Your cart is empty." };
    }
    throw error;
  }

  if (saveNewAddress) {
    // Best-effort: a failure here shouldn't undo an already-placed order.
    try {
      const addressData = addressSchema.parse({
        fullName: shipping.shippingName,
        line1: shipping.shippingLine1,
        line2: shipping.shippingLine2 ?? undefined,
        city: shipping.shippingCity,
        state: shipping.shippingState,
        postalCode: shipping.shippingPostal,
        country: shipping.shippingCountry,
      });
      const existingCount = await prisma.address.count({ where: { userId: session.user.id } });
      const makeDefault = existingCount === 0 || saveNewAddress.setDefault;

      await prisma.$transaction(async (tx) => {
        if (makeDefault) {
          await tx.address.updateMany({
            where: { userId: session.user.id },
            data: { isDefault: false },
          });
        }
        await tx.address.create({
          data: { ...addressData, userId: session.user.id, isDefault: makeDefault },
        });
      });
    } catch (error) {
      console.error("Failed to save address from checkout:", error);
    }
  }

  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    include: { items: true },
  });

  const stripeCustomerId = await ensureStripeCustomer(
    session.user.id,
    session.user.email ?? "",
    session.user.name
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const stripe = getStripe();

  let discounts: { coupon: string }[] | undefined;
  if (totalCreditAppliedCents > 0) {
    const coupon = await stripe.coupons.create({
      amount_off: totalCreditAppliedCents,
      currency: "usd",
      duration: "once",
      name: "EZBZ store credit",
    });
    discounts = [{ coupon: coupon.id }];
  }

  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: "payment",
    customer: stripeCustomerId,
    payment_method_types: ["card", "klarna"],
    automatic_tax: { enabled: true },
    customer_update: { shipping: "auto" },
    shipping_address_collection: { allowed_countries: ["US", "CA"] },
    discounts,
    line_items: [
      ...orders.flatMap((order) =>
        order.items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: "usd",
            unit_amount: item.priceCentsAtPurchase,
            product_data: { name: item.titleAtPurchase },
          },
        }))
      ),
      // A separate line item, not folded into any order's subtotal — it's
      // never split with a seller (only merchantPayoutCents gets
      // transferred out per order in the webhook), so it simply stays on
      // the platform's balance, which is exactly what "goes to Help Board"
      // means here.
      ...(roundUpCents > 0
        ? [
            {
              quantity: 1,
              price_data: {
                currency: "usd",
                unit_amount: roundUpCents,
                product_data: { name: "Round up for Help Board" },
              },
            },
          ]
        : []),
    ],
    metadata: { orderIds: orderIds.join(",") },
    success_url: `${appUrl}/checkout/success?orders=${orderIds.join(",")}`,
    cancel_url: `${appUrl}/checkout`,
  };

  let checkoutSession;
  try {
    checkoutSession = await stripe.checkout.sessions.create(sessionParams);
  } catch (error) {
    // Stripe Tax requires a one-time "origin address" set up in the Stripe
    // dashboard (Settings > Tax) before it'll calculate tax, even in test
    // mode. Don't let that block checkout entirely — fall back to no
    // automatic tax rather than 500ing on every order until it's set up.
    const isTaxOriginError =
      error instanceof Error && error.message.includes("head office address");
    if (!isTaxOriginError) throw error;

    console.warn(
      "Stripe Tax is not configured (missing origin address) — falling back to no automatic tax for this checkout."
    );
    checkoutSession = await stripe.checkout.sessions.create({
      ...sessionParams,
      automatic_tax: { enabled: false },
    });
  }

  await prisma.order.updateMany({
    where: { id: { in: orderIds } },
    data: {
      stripeCheckoutSessionId: checkoutSession.id,
      stripePaymentIntentId:
        typeof checkoutSession.payment_intent === "string" ? checkoutSession.payment_intent : null,
    },
  });

  if (!checkoutSession.url) {
    return { error: "Could not start checkout. Please try again." };
  }

  redirect(checkoutSession.url);
}
