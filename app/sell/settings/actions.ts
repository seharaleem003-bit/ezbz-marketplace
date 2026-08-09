"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { sellerShippingAddressSchema, handlingDaysSchema } from "@/lib/validation/seller";

export type ShippingAddressState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

export type HandlingDaysState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

export async function updateShippingAddressAction(
  _prevState: ShippingAddressState,
  formData: FormData
): Promise<ShippingAddressState> {
  const session = await verifySession();
  const seller = await prisma.seller.findUnique({ where: { userId: session.user.id } });
  if (!seller) redirect("/sell");

  const parsed = sellerShippingAddressSchema.safeParse({
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2"),
    city: formData.get("city"),
    region: formData.get("region"),
    postalCode: formData.get("postalCode"),
    country: formData.get("country"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.seller.update({
    where: { id: seller.id },
    data: parsed.data,
  });

  revalidatePath("/sell");
  revalidatePath("/sell/settings");
  redirect("/sell");
}

export async function updateHandlingDaysAction(
  _prevState: HandlingDaysState,
  formData: FormData
): Promise<HandlingDaysState> {
  const session = await verifySession();
  const seller = await prisma.seller.findUnique({ where: { userId: session.user.id } });
  if (!seller) redirect("/sell");

  const parsed = handlingDaysSchema.safeParse({ handlingDays: formData.get("handlingDays") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.seller.update({
    where: { id: seller.id },
    data: { handlingDays: parsed.data.handlingDays },
  });

  revalidatePath("/sell/settings");
  redirect("/sell/settings");
}
