"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { addressSchema } from "@/lib/validation/address";

export type AddressActionState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

async function loadOwnedAddress(addressId: string, userId: string) {
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.userId !== userId) throw new Error("Address not found");
  return address;
}

export async function createAddressAction(
  _prevState: AddressActionState,
  formData: FormData
): Promise<AddressActionState> {
  const session = await verifySession();

  const parsed = addressSchema.safeParse({
    fullName: formData.get("fullName"),
    line1: formData.get("line1"),
    line2: formData.get("line2"),
    city: formData.get("city"),
    state: formData.get("state"),
    postalCode: formData.get("postalCode"),
    country: formData.get("country"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const existingCount = await prisma.address.count({ where: { userId: session.user.id } });
  const makeDefault = existingCount === 0 || formData.get("isDefault") === "on";

  await prisma.$transaction(async (tx) => {
    if (makeDefault) {
      await tx.address.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });
    }
    await tx.address.create({
      data: { ...parsed.data, userId: session.user.id, isDefault: makeDefault },
    });
  });

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  redirect("/account/addresses");
}

export async function updateAddressAction(
  addressId: string,
  _prevState: AddressActionState,
  formData: FormData
): Promise<AddressActionState> {
  const session = await verifySession();
  await loadOwnedAddress(addressId, session.user.id);

  const parsed = addressSchema.safeParse({
    fullName: formData.get("fullName"),
    line1: formData.get("line1"),
    line2: formData.get("line2"),
    city: formData.get("city"),
    state: formData.get("state"),
    postalCode: formData.get("postalCode"),
    country: formData.get("country"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  let makeDefault = formData.get("isDefault") === "on";

  await prisma.$transaction(async (tx) => {
    if (!makeDefault) {
      const otherDefaultExists = await tx.address.findFirst({
        where: { userId: session.user.id, id: { not: addressId }, isDefault: true },
      });
      // Never leave the account with zero default addresses.
      if (!otherDefaultExists) makeDefault = true;
    }
    if (makeDefault) {
      await tx.address.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });
    }
    await tx.address.update({
      where: { id: addressId },
      data: { ...parsed.data, isDefault: makeDefault },
    });
  });

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  redirect("/account/addresses");
}

export async function deleteAddressAction(addressId: string): Promise<void> {
  const session = await verifySession();
  const address = await loadOwnedAddress(addressId, session.user.id);

  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id: addressId } });

    if (address.isDefault) {
      const next = await tx.address.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      });
      if (next) {
        await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
  });

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
}

export async function setDefaultAddressAction(addressId: string): Promise<void> {
  const session = await verifySession();
  await loadOwnedAddress(addressId, session.user.id);

  await prisma.$transaction(async (tx) => {
    await tx.address.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false },
    });
    await tx.address.update({ where: { id: addressId }, data: { isDefault: true } });
  });

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
}
