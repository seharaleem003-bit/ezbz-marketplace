import "server-only";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

export const SHARE_REF_COOKIE = "ezbz_ref";
export const SHARE_REF_PARAM = "ref";

// No expiry window — a share earns whenever the purchase happens. Cookies
// still need *some* max-age, and Chrome silently caps any value above 400
// days, so that ceiling is the practical "forever" for an anonymous visitor.
// Once they sign in, attribution is snapshotted onto the order and no longer
// depends on the cookie surviving.
export const ATTRIBUTION_MAX_AGE_DAYS = 400;
export const ATTRIBUTION_WINDOW_SECONDS = ATTRIBUTION_MAX_AGE_DAYS * 24 * 60 * 60;

// 2% total to the sharer, funded half by the platform's commission and half by
// the seller's payout — so neither side carries the whole cost.
export const SHARE_COMMISSION_BPS = 200;
export const SHARE_PLATFORM_SHARE_BPS = 100;
export const SHARE_SELLER_SHARE_BPS = 100;

export interface ShareAttribution {
  referrerUserId: string;
  commissionCents: number;
  platformPortionCents: number;
  sellerPortionCents: number;
}

/**
 * Resolves the pending share cookie into a payable referrer.
 *
 * Returns null when there's no cookie, the code doesn't match a user, or the
 * buyer is the sharer (self-referral). The caller is responsible for applying
 * the returned split to the order's fee accounting.
 */
export async function resolveShareAttribution({
  buyerUserId,
  subtotalCents,
}: {
  buyerUserId: string;
  subtotalCents: number;
}): Promise<ShareAttribution | null> {
  const cookieStore = await cookies();
  const code = cookieStore.get(SHARE_REF_COOKIE)?.value;
  if (!code) return null;

  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true },
  });
  if (!referrer) return null;

  // Self-referral: sharing your own link and buying through it earns nothing.
  if (referrer.id === buyerUserId) return null;

  const platformPortionCents = Math.round((subtotalCents * SHARE_PLATFORM_SHARE_BPS) / 10000);
  const sellerPortionCents = Math.round((subtotalCents * SHARE_SELLER_SHARE_BPS) / 10000);
  const commissionCents = platformPortionCents + sellerPortionCents;

  if (commissionCents <= 0) return null;

  return {
    referrerUserId: referrer.id,
    commissionCents,
    platformPortionCents,
    sellerPortionCents,
  };
}

export async function clearShareAttribution() {
  const cookieStore = await cookies();
  cookieStore.delete(SHARE_REF_COOKIE);
}
