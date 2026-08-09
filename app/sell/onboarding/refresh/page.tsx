import { startConnectOnboardingAction } from "../actions";

// Stripe redirects here if an onboarding link expired mid-flow — this
// mints a fresh one and redirects the seller straight back into it.
export default async function OnboardingRefreshPage() {
  await startConnectOnboardingAction();
  return null;
}
