import type { ListingCondition } from "@prisma/client";

// How much of a listing's value survives its stated condition — used to
// scale the condition component of the score.
const CONDITION_WEIGHT: Record<ListingCondition, number> = {
  NEW: 1,
  LIKE_NEW: 0.9,
  GOOD: 0.75,
  FAIR: 0.55,
  SALVAGE: 0.35,
};

export interface DealScoreInputs {
  priceCents: number;
  retailPriceCents?: number | null;
  amazonPriceCents?: number | null;
  condition: ListingCondition;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/**
 * Deal Score(TM): 0-100. Weighs discount off retail (60pts), how much
 * cheaper than Amazon's current price (20pts), and item condition (20pts).
 * Recompute and persist on every listing create/update — see
 * Listing.dealScore in prisma/schema.prisma.
 */
export function computeDealScore({
  priceCents,
  retailPriceCents,
  amazonPriceCents,
  condition,
}: DealScoreInputs): number {
  if (priceCents <= 0) return 0;

  let retailComponent = 0;
  if (retailPriceCents && retailPriceCents > priceCents) {
    const discount = (retailPriceCents - priceCents) / retailPriceCents;
    retailComponent = clamp01(discount) * 60;
  }

  let amazonComponent = 0;
  if (amazonPriceCents && amazonPriceCents > priceCents) {
    const savings = (amazonPriceCents - priceCents) / amazonPriceCents;
    amazonComponent = clamp01(savings) * 20;
  }

  const conditionComponent = CONDITION_WEIGHT[condition] * 20;

  const raw = retailComponent + amazonComponent + conditionComponent;
  return Math.round(clamp01(raw / 100) * 100);
}
