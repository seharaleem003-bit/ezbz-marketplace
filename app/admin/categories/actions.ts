"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/dal";
import { categorySchema } from "@/lib/validation/category";

export type CategoryActionState =
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
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${root}-${attempt + 2}`;
  }
  return `${root}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createCategoryAction(
  _prevState: CategoryActionState,
  formData: FormData
): Promise<CategoryActionState> {
  await requireAdmin();

  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const slug = await uniqueSlug(slugify(parsed.data.name));
  await prisma.category.create({ data: { name: parsed.data.name, slug } });

  revalidatePath("/admin/categories");
  return undefined;
}

export async function updateCategoryAction(
  categoryId: string,
  _prevState: CategoryActionState,
  formData: FormData
): Promise<CategoryActionState> {
  await requireAdmin();

  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const slug = await uniqueSlug(slugify(parsed.data.name), categoryId);
  await prisma.category.update({ where: { id: categoryId }, data: { name: parsed.data.name, slug } });

  revalidatePath("/admin/categories");
  return undefined;
}

export async function deleteCategoryAction(
  categoryId: string
): Promise<{ error?: string } | undefined> {
  await requireAdmin();

  const listingCount = await prisma.listing.count({ where: { categoryId } });
  if (listingCount > 0) {
    return {
      error: `Can't delete — ${listingCount} listing${listingCount === 1 ? "" : "s"} still use this category.`,
    };
  }

  await prisma.category.delete({ where: { id: categoryId } });
  revalidatePath("/admin/categories");
  return undefined;
}
