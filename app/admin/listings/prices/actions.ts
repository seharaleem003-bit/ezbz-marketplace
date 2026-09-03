"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireCatalogAccess } from "@/lib/auth/dal";
import { computeDealScore } from "@/lib/deal-score";

export type PriceUpdateState = { saved?: number; error?: string } | undefined;

/**
 * Saves Amazon comparison prices in bulk.
 *
 * Each price also refreshes the Deal Score, since that's what the price is
 * for, and stamps amazonPriceCheckedAt so the listing page can say when the
 * comparison was last verified. Blank inputs are skipped rather than treated
 * as "clear the price" — clearing is a deliberate act, not a side effect of
 * leaving a row alone.
 */
export async function saveAmazonPricesAction(
  _prev: PriceUpdateState,
  formData: FormData
): Promise<PriceUpdateState> {
  await requireCatalogAccess();

  const updates: { id: string; cents: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("price:") || typeof value !== "string") continue;
    const raw = value.replace(/[^0-9.]/g, "");
    if (!raw) continue;
    const dollars = Number(raw);
    if (!Number.isFinite(dollars) || dollars <= 0) continue;
    updates.push({ id: key.slice("price:".length), cents: Math.round(dollars * 100) });
  }

  if (updates.length === 0) return { error: "Enter at least one price." };

  let saved = 0;
  for (const { id, cents } of updates) {
    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { priceCents: true, retailPriceCents: true, condition: true, amazonPriceCents: true },
    });
    if (!listing || listing.amazonPriceCents === cents) continue;

    await prisma.listing.update({
      where: { id },
      data: {
        amazonPriceCents: cents,
        amazonPriceCheckedAt: new Date(),
        dealScore: computeDealScore({
          priceCents: listing.priceCents,
          retailPriceCents: listing.retailPriceCents,
          amazonPriceCents: cents,
          condition: listing.condition,
        }),
        dealScoreUpdatedAt: new Date(),
      },
    });
    saved++;
  }

  revalidatePath("/admin/listings");
  revalidatePath("/admin/listings/prices");
  revalidatePath("/listings");
  revalidatePath("/");

  return { saved };
}
