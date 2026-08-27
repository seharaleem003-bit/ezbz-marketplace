/**
 * Flags for parts of the product that are built but deliberately not open yet.
 *
 * These exist so launch-blocking decisions are one line to reverse, rather than
 * code that has to be deleted and rewritten later.
 */

/**
 * Whether the public can apply to sell on EZBZ.
 *
 * Off for launch: the marketplace is going live on EZBZ-direct inventory first,
 * and the seller flow (application → Connect onboarding → identity verification
 * → listing management) needs more work before strangers are let into it. While
 * this is off, `/sell` shows a "coming soon" page to everyone except sellers who
 * are already approved, so existing accounts keep their dashboard.
 *
 * Turn back on by flipping this to `true` — nothing else needs changing.
 */
export const SELLER_SIGNUP_OPEN = false;
