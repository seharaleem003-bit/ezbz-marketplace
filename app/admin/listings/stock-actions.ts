"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireCatalogAccess } from "@/lib/auth/dal";

export type SetStockResult = { quantity?: number; error?: string };

/**
 * Sets a listing's stock straight from the listings table.
 *
 * Same permission as editing the listing itself — staff maintain the
 * catalogue, so they can correct a count without an admin. Kept deliberately
 * narrow: it writes inventoryQty and nothing else, so it can't be used to
 * publish or reprice anything.
 */
export async function setListingStockAction(
  listingId: string,
  quantity: number
): Promise<SetStockResult> {
  await requireCatalogAccess();

  if (!Number.isInteger(quantity) || quantity < 0) {
    return { error: "Stock must be a whole number, zero or more." };
  }
  if (quantity > 100000) {
    return { error: "That stock number looks wrong." };
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { slug: true },
  });
  if (!listing) return { error: "That listing no longer exists." };

  await prisma.listing.update({
    where: { id: listingId },
    data: { inventoryQty: quantity },
  });

  revalidatePath("/admin/listings");
  revalidatePath(`/listings/${listing.slug}`);
  revalidatePath("/listings");

  return { quantity };
}
