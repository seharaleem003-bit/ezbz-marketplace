"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/dal";
import { nonprofitPartnerSchema, linkPartnerContactSchema } from "@/lib/validation/nonprofit-partner";

export type PartnerActionState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

export async function createPartnerAction(
  _prevState: PartnerActionState,
  formData: FormData
): Promise<PartnerActionState> {
  await requireAdmin();

  const parsed = nonprofitPartnerSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await prisma.nonprofitPartner.create({ data: { name: parsed.data.name } });

  revalidatePath("/admin/partners");
  return undefined;
}

export async function setPartnerStatusAction(
  partnerId: string,
  status: "PENDING" | "APPROVED" | "SUSPENDED"
): Promise<void> {
  await requireAdmin();

  await prisma.nonprofitPartner.update({ where: { id: partnerId }, data: { status } });

  revalidatePath("/admin/partners");
}

export async function linkPartnerContactAction(
  partnerId: string,
  _prevState: PartnerActionState,
  formData: FormData
): Promise<PartnerActionState> {
  await requireAdmin();

  const parsed = linkPartnerContactSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return { error: "No account exists with that email yet — they need to sign up first." };

  const existingLink = await prisma.nonprofitPartner.findUnique({ where: { contactUserId: user.id } });
  if (existingLink && existingLink.id !== partnerId) {
    return { error: "That user is already the contact for another partner organization." };
  }

  await prisma.nonprofitPartner.update({
    where: { id: partnerId },
    data: { contactUserId: user.id },
  });

  revalidatePath("/admin/partners");
  return undefined;
}

export async function unlinkPartnerContactAction(partnerId: string): Promise<void> {
  await requireAdmin();

  await prisma.nonprofitPartner.update({ where: { id: partnerId }, data: { contactUserId: null } });

  revalidatePath("/admin/partners");
}
