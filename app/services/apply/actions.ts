"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { providerApplicationSchema } from "@/lib/validation/service-provider";

export type ProviderApplyState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

export async function applyForProviderAction(
  _prevState: ProviderApplyState,
  formData: FormData
): Promise<ProviderApplyState> {
  const session = await verifySession();

  const existing = await prisma.serviceProvider.findUnique({ where: { userId: session.user.id } });
  if (existing) redirect("/provider");

  const parsed = providerApplicationSchema.safeParse({
    businessName: formData.get("businessName"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    city: formData.get("city"),
    region: formData.get("region"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const category = await prisma.serviceCategory.findUnique({ where: { id: parsed.data.categoryId } });
  if (!category) return { error: "Please choose a valid category." };

  await prisma.serviceProvider.create({
    data: {
      userId: session.user.id,
      categoryId: parsed.data.categoryId,
      businessName: parsed.data.businessName,
      description: parsed.data.description,
      city: parsed.data.city,
      region: parsed.data.region,
    },
  });

  redirect("/services/apply/submitted");
}
