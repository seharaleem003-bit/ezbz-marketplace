"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/dal";
import { serviceCategorySchema } from "@/lib/validation/service-category";

export type ServiceCategoryActionState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uniqueSlug(base: string, excludeId?: string) {
  const root = base || "category";
  let slug = root;
  for (let attempt = 0; attempt < 20; attempt++) {
    const existing = await prisma.serviceCategory.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${root}-${attempt + 2}`;
  }
  return `${root}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createServiceCategoryAction(
  _prevState: ServiceCategoryActionState,
  formData: FormData
): Promise<ServiceCategoryActionState> {
  await requireAdmin();

  const parsed = serviceCategorySchema.safeParse({
    name: formData.get("name"),
    group: formData.get("group"),
    sortOrder: formData.get("sortOrder"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const slug = await uniqueSlug(slugify(parsed.data.name));
  await prisma.serviceCategory.create({
    data: { name: parsed.data.name, group: parsed.data.group, sortOrder: parsed.data.sortOrder, slug },
  });

  revalidatePath("/admin/service-categories");
  revalidatePath("/services");
  return undefined;
}

export async function updateServiceCategoryAction(
  categoryId: string,
  _prevState: ServiceCategoryActionState,
  formData: FormData
): Promise<ServiceCategoryActionState> {
  await requireAdmin();

  const parsed = serviceCategorySchema.safeParse({
    name: formData.get("name"),
    group: formData.get("group"),
    sortOrder: formData.get("sortOrder"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const slug = await uniqueSlug(slugify(parsed.data.name), categoryId);
  await prisma.serviceCategory.update({
    where: { id: categoryId },
    data: { name: parsed.data.name, group: parsed.data.group, sortOrder: parsed.data.sortOrder, slug },
  });

  revalidatePath("/admin/service-categories");
  revalidatePath("/services");
  return undefined;
}

export async function deleteServiceCategoryAction(
  categoryId: string
): Promise<{ error?: string } | undefined> {
  await requireAdmin();

  const providerCount = await prisma.serviceProvider.count({ where: { categoryId } });
  if (providerCount > 0) {
    return {
      error: `Can't delete — ${providerCount} provider${providerCount === 1 ? "" : "s"} still use this category.`,
    };
  }

  await prisma.serviceCategory.delete({ where: { id: categoryId } });
  revalidatePath("/admin/service-categories");
  revalidatePath("/services");
  return undefined;
}
