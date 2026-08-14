// Transit windows used when an order has no carrier quote attached — either it
// predates live rating, or it was priced from a flat estimate because the
// listing had no measured parcel. Replaced automatically the moment Easyship
// returns real numbers (see Order.estimatedDeliveryMinDays).
const FALLBACK_DELIVERY_DAYS = { min: 3, max: 7 };
const FALLBACK_PICKUP_DAYS = { min: 1, max: 2 };

// Days between an order being placed and actually leaving the warehouse. The
// carrier window covers transit only, so it has to be added on top.
const HANDLING_DAYS = 1;

export interface DeliveryEstimate {
  earliest: Date;
  latest: Date;
  /** True when the window came from a live carrier quote rather than a guess. */
  isCarrierQuote: boolean;
}

function addDays(from: Date, days: number): Date {
  const result = new Date(from);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Projects an arrival window for an order.
 *
 * Counts from the ship date when we have one — once a parcel is actually in
 * the carrier's hands the original order date stops being the useful anchor.
 */
export function estimateDelivery({
  placedAt,
  shippedAt,
  confirmedDeliveryAt,
  isPickup,
  minDays,
  maxDays,
}: {
  placedAt: Date;
  shippedAt?: Date | null;
  /** Exact date from the carrier once a shipment is booked — beats any window. */
  confirmedDeliveryAt?: Date | null;
  isPickup: boolean;
  minDays?: number | null;
  maxDays?: number | null;
}): DeliveryEstimate {
  if (confirmedDeliveryAt) {
    return {
      earliest: confirmedDeliveryAt,
      latest: confirmedDeliveryAt,
      isCarrierQuote: true,
    };
  }

  const isCarrierQuote = minDays != null && maxDays != null;

  const window = isCarrierQuote
    ? { min: minDays as number, max: maxDays as number }
    : isPickup
      ? FALLBACK_PICKUP_DAYS
      : FALLBACK_DELIVERY_DAYS;

  // Already shipped: transit runs from the handover, no handling left to add.
  const anchor = shippedAt ?? addDays(placedAt, isPickup ? 0 : HANDLING_DAYS);

  return {
    earliest: addDays(anchor, window.min),
    latest: addDays(anchor, window.max),
    isCarrierQuote,
  };
}

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const dayFormatterEs = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

export function formatDeliveryWindow(
  estimate: DeliveryEstimate,
  locale: "en" | "es" = "en"
): string {
  const formatter = locale === "es" ? dayFormatterEs : dayFormatter;
  const earliest = formatter.format(estimate.earliest);
  const latest = formatter.format(estimate.latest);

  // A one-day window reads better as a single date than "Mon 5 – Mon 5".
  return earliest === latest ? earliest : `${earliest} – ${latest}`;
}
