import "server-only";

import {
  getShippingRates,
  PLATFORM_ORIGIN_ADDRESS,
  type EasyshipDestination,
  type EasyshipRateItem,
} from "@/lib/easyship";

/**
 * EZBZ absorbs delivery on every order — there is no minimum.
 *
 * Carrier rating still runs underneath: the buyer is simply never charged the
 * result. That keeps the real cost visible in the admin panel and preserves
 * the carrier's transit window for delivery estimates, which a blanket
 * "shipping is zero" short-circuit would throw away.
 */
export const FREE_SHIPPING_ALWAYS = true;

// Retained so the old threshold copy and any callers still compile; with
// FREE_SHIPPING_ALWAYS on, nothing is ever below it.
export const FREE_SHIPPING_THRESHOLD_CENTS = 0;

// Flat estimates used until a listing carries real weight/dimensions. Banded
// by order value so a cheap trinket isn't quoted the same as a sofa. These are
// placeholders — once listings are measured, live carrier rates take over.
const ESTIMATE_BANDS: { upToCents: number; shippingCents: number }[] = [
  { upToCents: 2_500, shippingCents: 599 },
  { upToCents: 7_500, shippingCents: 899 },
  { upToCents: 15_000, shippingCents: 1_299 },
  { upToCents: Infinity, shippingCents: 1_899 },
];

export type ShippingQuoteSource = "free" | "pickup" | "live" | "estimated";

export interface ShippingQuote {
  shippingCents: number;
  source: ShippingQuoteSource;
  /** Short human-readable explanation, shown under the shipping line. */
  label: string;
  /** Cents still needed to unlock free shipping; 0 once the threshold is met. */
  remainingForFreeCents: number;
  carrier?: string;
  estimatedDaysMin?: number | null;
  estimatedDaysMax?: number | null;
}

export interface QuoteLineItem {
  title: string;
  quantity: number;
  priceCents: number;
  categorySlug: string | null;
  weightGrams: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
}

function estimateFor(subtotalCents: number): number {
  return (
    ESTIMATE_BANDS.find((band) => subtotalCents <= band.upToCents)?.shippingCents ??
    ESTIMATE_BANDS[ESTIMATE_BANDS.length - 1].shippingCents
  );
}

/** True only when every line has the full parcel data a real quote needs. */
function isFullyMeasured(items: QuoteLineItem[]): boolean {
  return items.every(
    (item) =>
      item.weightGrams != null &&
      item.weightGrams > 0 &&
      item.lengthCm != null &&
      item.widthCm != null &&
      item.heightCm != null
  );
}

function toRateItems(items: QuoteLineItem[]): EasyshipRateItem[] {
  return items.map((item) => ({
    description: item.title,
    quantity: item.quantity,
    priceCents: item.priceCents,
    categorySlug: item.categorySlug,
    weightKg: (item.weightGrams as number) / 1000,
    dimensionsCm: {
      length: item.lengthCm as number,
      width: item.widthCm as number,
      height: item.heightCm as number,
    },
  }));
}

/**
 * Prices delivery for a cart.
 *
 * Order of precedence: local pickup is always free, then the free-shipping
 * threshold, then live carrier rates when every item is measured, and finally
 * a flat estimate. A failed or unconfigured Easyship call degrades to the
 * estimate rather than blocking checkout.
 */
export async function quoteShipping({
  items,
  subtotalCents,
  destination,
  isPickup = false,
}: {
  items: QuoteLineItem[];
  subtotalCents: number;
  destination?: EasyshipDestination | null;
  isPickup?: boolean;
}): Promise<ShippingQuote> {
  if (isPickup) {
    return {
      shippingCents: 0,
      source: "pickup",
      label: "Free — local pickup",
      remainingForFreeCents: 0,
    };
  }

  const remainingForFreeCents = Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents);

  // Rating continues below even when delivery is free, so the carrier and its
  // transit window are still known; `free()` zeroes only what the buyer pays.
  const free = (quote: ShippingQuote): ShippingQuote =>
    FREE_SHIPPING_ALWAYS
      ? {
          ...quote,
          shippingCents: 0,
          source: "free",
          label: "Free shipping",
          remainingForFreeCents: 0,
        }
      : quote;

  if (!FREE_SHIPPING_ALWAYS && remainingForFreeCents === 0) {
    return {
      shippingCents: 0,
      source: "free",
      label: "Free shipping applied",
      remainingForFreeCents: 0,
    };
  }

  if (destination && process.env.EASYSHIP_API_KEY && isFullyMeasured(items)) {
    try {
      const rates = await getShippingRates({
        origin: PLATFORM_ORIGIN_ADDRESS,
        destination,
        items: toRateItems(items),
      });

      const cheapest = rates
        .filter((rate) => rate.totalCents > 0)
        .sort((a, b) => a.totalCents - b.totalCents)[0];

      if (cheapest) {
        return free({
          shippingCents: cheapest.totalCents,
          source: "live",
          label: `${cheapest.courierName} ${cheapest.serviceName}`,
          remainingForFreeCents,
          carrier: cheapest.courierName,
          estimatedDaysMin: cheapest.minDeliveryDays,
          estimatedDaysMax: cheapest.maxDeliveryDays,
        });
      }
    } catch (error) {
      // Never block checkout on a rating failure — fall through to the estimate.
      console.error("Easyship rate lookup failed; using estimate", error);
    }
  }

  return free({
    shippingCents: estimateFor(subtotalCents),
    source: "estimated",
    label: "Estimated standard shipping",
    remainingForFreeCents,
  });
}
