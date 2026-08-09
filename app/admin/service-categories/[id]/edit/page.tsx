import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { ServiceCategoryForm } from "../../category-form";
import { updateServiceCategoryAction } from "../../actions";

export const metadata: Metadata = {
  title: "Edit service category",
};

export const dynamic = "force-dynamic";

export default async function EditServiceCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await prisma.serviceCategory.findUnique({ where: { id } });
  if (!category) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-heading font-semibold">Edit service category</h1>
      <div className="max-w-sm rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <ServiceCategoryForm
          action={updateServiceCategoryAction.bind(null, category.id)}
          defaults={{ name: category.name, group: category.group, sortOrder: category.sortOrder }}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
