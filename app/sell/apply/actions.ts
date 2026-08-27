"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { SELLER_SIGNUP_OPEN } from "@/lib/feature-flags";
import { sellerApplicationSchema } from "@/lib/validation/seller";

export type SellerApplyState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

export async function applyToSellAction(
  _prevState: SellerApplyState,
  formData: FormData
): Promise<SellerApplyState> {
  // Server Actions are callable directly, so the page-level guard isn't enough.
  if (!SELLER_SIGNUP_OPEN) {
    redirect("/sell");
  }

  const session = await verifySession();

  const existing = await prisma.seller.findUnique({ where: { userId: session.user.id } });
  if (existing) {
    redirect("/sell");
  }

  const parsed = sellerApplicationSchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio"),
    city: formData.get("city"),
    region: formData.get("region"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.seller.create({
    data: {
      userId: session.user.id,
      displayName: parsed.data.displayName,
      bio: parsed.data.bio ?? null,
      city: parsed.data.city ?? null,
      region: parsed.data.region ?? null,
    },
  });

  redirect("/sell/apply/submitted");
}
