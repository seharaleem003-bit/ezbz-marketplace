import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { CategoryForm } from "../../category-form";
import { updateCategoryAction } from "../../actions";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Edit category",
};

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-heading font-semibold">Edit category</h1>
      <div className="max-w-sm rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <CategoryForm
          action={updateCategoryAction.bind(null, category.id)}
          defaultName={category.name}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
