"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";

export async function toggleWatchAction(listingId: string) {
  const session = await verifySession();

  const existing = await prisma.watch.findUnique({
    where: { userId_listingId: { userId: session.user.id, listingId } },
  });

  if (existing) {
    await prisma.watch.delete({ where: { id: existing.id } });
  } else {
    const listing = await prisma.listing.findUniqueOrThrow({ where: { id: listingId } });
    await prisma.watch.create({
      data: {
        userId: session.user.id,
        listingId,
        priceCentsAtWatch: listing.priceCents,
      },
    });
  }

  revalidatePath("/account/watches");
  revalidatePath("/listings", "layout");

  return { watching: !existing };
}

export async function removeWatchAction(watchId: string) {
  const session = await verifySession();

  await prisma.watch.deleteMany({ where: { id: watchId, userId: session.user.id } });

  revalidatePath("/account/watches");
}
