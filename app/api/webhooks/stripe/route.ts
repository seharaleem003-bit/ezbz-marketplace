import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { issueReferralBonusIfEligible } from "@/lib/store-credit";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { activateProviderIfEligible } from "@/lib/provider-activation";

// Every handler here must be idempotent — Stripe retries webhooks on
// non-2xx responses and can occasionally deliver the same event twice.
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing webhook signature or secret" }, { status: 400 });
  }

  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        // Three totally different flows share this one event type: a
        // regular cart checkout (has orderIds in metadata), a Help Board
        // "Sponsor a Need" one-off contribution (has helpBoardNeedId
        // instead), and a service provider's subscription purchase (has
        // providerId + plan) — none of these involve Order/split
        // accounting except the first.
        if (checkoutSession.metadata?.helpBoardNeedId) {
          await handleHelpBoardContributionCompleted(checkoutSession);
        } else if (checkoutSession.metadata?.providerId && checkoutSession.metadata?.plan) {
          await handleServiceSubscriptionCompleted(checkoutSession);
        } else {
          await handleCheckoutCompleted(stripe, checkoutSession);
        }
        break;
      }
      case "checkout.session.expired":
        await restoreInventoryForOrders({ checkoutSessionId: event.data.object.id });
        break;
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await restoreInventoryForOrders({ paymentIntentId: paymentIntent.id });
        break;
      }
      case "account.updated":
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;
      case "identity.verification_session.verified": {
        const verificationSession = event.data.object as Stripe.Identity.VerificationSession;
        await handleIdentityVerified(verificationSession);
        break;
      }
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeCreated(dispute);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error(`Error handling Stripe webhook event ${event.type}`, error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(stripe: Stripe, checkoutSession: Stripe.Checkout.Session) {
  const orderIdsRaw = checkoutSession.metadata?.orderIds;
  if (!orderIdsRaw) return;
  const orderIds = orderIdsRaw.split(",").filter(Boolean);
  if (orderIds.length === 0) return;

  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    include: { seller: true, fundraiser: true, items: true },
  });
  if (orders.length === 0) return;

  // Already processed (Stripe can redeliver the same event) — skip.
  if (orders.every((order) => order.paymentStatus === "PAID")) return;

  const totalTaxCents = checkoutSession.total_details?.amount_tax ?? 0;
  const combinedSubtotal = orders.reduce((sum, order) => sum + order.subtotalCents, 0);

  let chargeId: string | undefined;
  if (typeof checkoutSession.payment_intent === "string") {
    const paymentIntent = await stripe.paymentIntents.retrieve(checkoutSession.payment_intent);
    chargeId = typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : undefined;
  }

  let newlyPaidCount = 0;

  for (const order of orders) {
    if (order.paymentStatus === "PAID") continue;

    const shareOfTax =
      combinedSubtotal > 0 ? Math.round((order.subtotalCents / combinedSubtotal) * totalTaxCents) : 0;

    // Stripe can (and did, in testing) deliver the same checkout.session.completed
    // event via two concurrent requests. A plain read-then-write here has a race:
    // both requests can read paymentStatus as not-yet-PAID before either write
    // commits, and both then create a transfer / send a confirmation email.
    // Guarding the update itself on paymentStatus != PAID makes the transition
    // atomic — Postgres serializes the two UPDATEs, so only one can match and
    // return count 1; the loser sees count 0 and skips the rest of this order.
    const { count } = await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: { not: "PAID" } },
      data: {
        paymentStatus: "PAID",
        taxCents: shareOfTax,
        totalCents: order.subtotalCents + shareOfTax - order.storeCreditAppliedCents,
        // The PaymentIntent isn't always available yet when the Checkout
        // Session is first created (see app/checkout/actions.ts) — it's
        // always present by the time this event fires, so backfill it here.
        stripePaymentIntentId:
          typeof checkoutSession.payment_intent === "string"
            ? checkoutSession.payment_intent
            : order.stripePaymentIntentId,
      },
    });
    if (count === 0) continue;
    newlyPaidCount++;

    if (order.roundUpCents > 0) {
      await prisma.helpBoardContribution.create({
        data: {
          contributorUserId: order.userId,
          relatedOrderId: order.id,
          amountCents: order.roundUpCents,
          source: "ROUND_UP",
          stripePaymentIntentId:
            typeof checkoutSession.payment_intent === "string" ? checkoutSession.payment_intent : null,
        },
      });
    }

    const destinationAccountId = order.seller?.stripeAccountId ?? order.fundraiser?.stripeAccountId;
    if (destinationAccountId && order.merchantPayoutCents > 0 && chargeId) {
      try {
        const transfer = await stripe.transfers.create({
          amount: order.merchantPayoutCents,
          currency: "usd",
          destination: destinationAccountId,
          source_transaction: chargeId,
          metadata: { orderId: order.id },
        });
        await prisma.order.update({
          where: { id: order.id },
          data: { stripeTransferId: transfer.id },
        });
      } catch (error) {
        // Payment already succeeded — a failed transfer shouldn't fail the
        // whole webhook (that would make Stripe retry a payment that
        // already went through). Log for manual reconciliation instead.
        console.error(`Failed to create payout transfer for order ${order.id}`, error);
      }
    }

    if (order.sellerId) {
      await prisma.seller.update({
        where: { id: order.sellerId },
        data: { firstSaleUsed: true },
      });
    }

    if (order.storeCreditAppliedCents > 0) {
      await prisma.storeCreditTransaction.create({
        data: {
          userId: order.userId,
          amountCents: -order.storeCreditAppliedCents,
          reason: "REDEEMED_AT_CHECKOUT",
          relatedOrderId: order.id,
        },
      });
    }

    // Sequential by design: this must run after the order above is marked
    // PAID so the "is this the buyer's first paid order" check inside sees
    // sibling orders from the same multi-seller checkout as already settled,
    // and only credits the referrer once per checkout, not once per order.
    await issueReferralBonusIfEligible(order.userId, order.id);
  }

  const buyerId = orders[0]?.userId;
  if (buyerId) {
    await prisma.cartItem.deleteMany({ where: { cart: { userId: buyerId } } });

    // Only the request that actually won the race for at least one order
    // sends the confirmation — otherwise the losing duplicate delivery
    // would email the buyer a second time for nothing it actually did.
    if (newlyPaidCount > 0) {
      const buyer = await prisma.user.findUnique({ where: { id: buyerId } });
      if (buyer?.email) {
        await sendOrderConfirmationEmail(orders, buyer.email);
      }
    }
  }
}

async function handleHelpBoardContributionCompleted(checkoutSession: Stripe.Checkout.Session) {
  const needId = checkoutSession.metadata?.helpBoardNeedId;
  if (!needId) return;

  const paymentIntentId =
    typeof checkoutSession.payment_intent === "string" ? checkoutSession.payment_intent : undefined;
  if (!paymentIntentId) return;

  // Idempotency: Stripe can redeliver the same event.
  const existing = await prisma.helpBoardContribution.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
  });
  if (existing) return;

  const amountCents = checkoutSession.amount_total ?? 0;
  if (amountCents <= 0) return;

  const contributorUserId = checkoutSession.metadata?.contributorUserId || undefined;

  await prisma.$transaction(async (tx) => {
    await tx.helpBoardContribution.create({
      data: {
        needId,
        contributorUserId,
        amountCents,
        source: "DIRECT",
        stripePaymentIntentId: paymentIntentId,
      },
    });

    const need = await tx.helpBoardNeed.update({
      where: { id: needId },
      data: { raisedCents: { increment: amountCents } },
    });

    // "FULFILLED" means the funding goal was met — not that the item has
    // physically reached the person in need. That's a separate admin action
    // (see markNeedDeliveredAction) that sets deliveredAt once confirmed.
    if (need.status === "OPEN" && need.raisedCents >= need.goalCents) {
      await tx.helpBoardNeed.update({
        where: { id: needId },
        data: { status: "FULFILLED" },
      });
    }
  });
}

const SUBSCRIPTION_PLAN_DAYS: Record<string, number> = {
  THREE_MONTH: 90,
  SIX_MONTH: 182,
  TWELVE_MONTH: 365,
};

// Flat-fee, fixed-duration purchase (not recurring Stripe Billing) — matches
// the brief exactly: "pay this flat subscription fee to maintain an active
// listing for the chosen duration." A provider goes ACTIVE once this,
// identity verification, and the background check have all cleared.
async function handleServiceSubscriptionCompleted(checkoutSession: Stripe.Checkout.Session) {
  const providerId = checkoutSession.metadata?.providerId;
  const plan = checkoutSession.metadata?.plan;
  if (!providerId || !plan || !(plan in SUBSCRIPTION_PLAN_DAYS)) return;

  const paymentIntentId =
    typeof checkoutSession.payment_intent === "string" ? checkoutSession.payment_intent : undefined;
  if (!paymentIntentId) return;

  const existing = await prisma.serviceSubscription.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
  });
  if (existing) return;

  const priceCents = checkoutSession.amount_total ?? 0;
  if (priceCents <= 0) return;

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + SUBSCRIPTION_PLAN_DAYS[plan] * 24 * 60 * 60 * 1000);

  await prisma.serviceSubscription.create({
    data: {
      providerId,
      plan: plan as "THREE_MONTH" | "SIX_MONTH" | "TWELVE_MONTH",
      priceCents,
      startsAt,
      endsAt,
      stripePaymentIntentId: paymentIntentId,
      status: "ACTIVE",
    },
  });

  await activateProviderIfEligible(providerId);
}

async function restoreInventoryForOrders({
  paymentIntentId,
  checkoutSessionId,
}: {
  paymentIntentId?: string;
  checkoutSessionId?: string;
}) {
  const orders = await prisma.order.findMany({
    where: paymentIntentId
      ? { stripePaymentIntentId: paymentIntentId }
      : { stripeCheckoutSessionId: checkoutSessionId },
    include: { items: true },
  });

  for (const order of orders) {
    if (order.paymentStatus === "PAID") continue; // already succeeded — don't double-restore

    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.listing.update({
          where: { id: item.listingId },
          data: { inventoryQty: { increment: item.quantity } },
        });
      }
      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: "FAILED", status: "CANCELLED" },
      });
    });
  }
}

async function handleIdentityVerified(verificationSession: Stripe.Identity.VerificationSession) {
  const providerId = verificationSession.metadata?.providerId;
  const sellerId = verificationSession.metadata?.sellerId;

  if (providerId) {
    await prisma.serviceProvider.update({
      where: { id: providerId },
      data: { identityVerifiedAt: new Date() },
    });
    await activateProviderIfEligible(providerId);
    return;
  }

  if (sellerId) {
    await prisma.seller.update({ where: { id: sellerId }, data: { identityVerifiedAt: new Date() } });
    return;
  }

  // Metadata is always set when we create the session (see
  // startIdentityVerificationAction / startProviderIdentityVerificationAction)
  // — this fallback only matters for sessions from before that was true.
  const seller = await prisma.seller.findFirst({
    where: { identityVerificationId: verificationSession.id },
  });
  if (seller) {
    await prisma.seller.update({ where: { id: seller.id }, data: { identityVerifiedAt: new Date() } });
    return;
  }
  const provider = await prisma.serviceProvider.findFirst({
    where: { identityVerificationId: verificationSession.id },
  });
  if (provider) {
    await prisma.serviceProvider.update({
      where: { id: provider.id },
      data: { identityVerifiedAt: new Date() },
    });
    await activateProviderIfEligible(provider.id);
  }
}

// Feeds the trust badge's refund/dispute rate (lib/seller-badges.ts) with a
// real, verifiable signal instead of relying on refunds alone. Disputes are
// filed per-PaymentIntent, so every sibling Order sharing that intent (a
// multi-seller cart) gets marked — Stripe doesn't tell us which line item
// was actually disputed.
async function handleDisputeCreated(dispute: Stripe.Dispute) {
  const paymentIntentId =
    typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
  if (!paymentIntentId) return;

  await prisma.order.updateMany({
    where: { stripePaymentIntentId: paymentIntentId },
    data: { disputedAt: new Date() },
  });
}

async function handleAccountUpdated(account: Stripe.Account) {
  const onboardingComplete = Boolean(account.charges_enabled && account.payouts_enabled);

  await prisma.seller.updateMany({
    where: { stripeAccountId: account.id },
    data: { stripeOnboardingComplete: onboardingComplete },
  });
  await prisma.fundraiser.updateMany({
    where: { stripeAccountId: account.id },
    data: { stripeOnboardingComplete: onboardingComplete },
  });
}
