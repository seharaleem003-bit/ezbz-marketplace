// Reservation discount, applied at checkout rather than baked into the listing
// price — buyers see the full launch price struck through against what they
// actually pay, and the receipt shows exactly where the saving came from.
export const PREBOOK_DISCOUNT_BPS = 1000; // 10%

export function prebookDiscountFor(lineTotalCents: number): number {
  return Math.round((lineTotalCents * PREBOOK_DISCOUNT_BPS) / 10000);
}

export interface PrebookLine {
  isPrebook: boolean;
  priceCents: number;
  quantity: number;
}

/** Total discount across only the pre-book lines in a cart. */
export function totalPrebookDiscount(lines: PrebookLine[]): number {
  return lines
    .filter((line) => line.isPrebook)
    .reduce((sum, line) => sum + prebookDiscountFor(line.priceCents * line.quantity), 0);
}
