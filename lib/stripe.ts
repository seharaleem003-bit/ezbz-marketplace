import "server-only";
import Stripe from "stripe";

const globalForStripe = globalThis as unknown as { stripe?: Stripe };

// Lazy on purpose: Next's build step loads every route module (including
// this one, transitively) to collect page data, so throwing at import time
// when STRIPE_SECRET_KEY isn't set yet would break `next build` even for
// routes that never actually call Stripe during that pass.
export function getStripe(): Stripe {
  if (globalForStripe.stripe) return globalForStripe.stripe;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  const client = new Stripe(secretKey);
  if (process.env.NODE_ENV !== "production") {
    globalForStripe.stripe = client;
  }
  return client;
}
