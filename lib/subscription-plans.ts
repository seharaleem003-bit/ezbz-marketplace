export const SUBSCRIPTION_PLANS = {
  THREE_MONTH: { label: "3 months", priceCents: 9900 },
  SIX_MONTH: { label: "6 months", priceCents: 16900 },
  TWELVE_MONTH: { label: "12 months", priceCents: 34000 },
} as const;

export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLANS;
