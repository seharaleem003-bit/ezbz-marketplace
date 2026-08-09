// Commission rates in basis points (1/100th of a percent). Snapshotted onto
// each Order at checkout time so a later rate change never rewrites history.
export const STANDARD_COMMISSION_BPS = 1500; // 15%, flat, no seller tiers
export const FUNDRAISER_COMMISSION_BPS = 500; // ~5%, per brief ("exact number TBD")
export const FIRST_SALE_COMMISSION_BPS = 0; // First Sale Free growth mechanic

export function resolveCommissionBps({
  fundraiserCommissionBps,
  sellerFirstSaleUsed,
}: {
  fundraiserCommissionBps?: number | null;
  sellerFirstSaleUsed?: boolean;
}): number {
  if (fundraiserCommissionBps != null) return fundraiserCommissionBps;
  if (sellerFirstSaleUsed === false) return FIRST_SALE_COMMISSION_BPS;
  return STANDARD_COMMISSION_BPS;
}

export function splitAmountCents(totalCents: number, commissionBps: number) {
  const platformFeeCents = Math.round((totalCents * commissionBps) / 10000);
  const merchantPayoutCents = totalCents - platformFeeCents;
  return { platformFeeCents, merchantPayoutCents };
}
