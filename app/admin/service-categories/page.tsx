import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ServiceCategoryForm } from "./category-form";
import { createServiceCategoryAction } from "./actions";
import { DeleteServiceCategoryButton } from "./delete-button";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Service categories",
};

export const dynamic = "force-dynamic";

export default async function AdminServiceCategoriesPage() {
  await requireAdmin();

  const categories = await prisma.serviceCategory.findMany({
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { providers: true } } },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-heading font-semibold">Service categories</h1>

      <div className="mb-6 overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Providers</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-muted-foreground">{category.group}</TableCell>
                <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                <TableCell>{category._count.providers}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/admin/service-categories/${category.id}/edit`} />}
                    >
                      Edit
                    </Button>
                    {category._count.providers === 0 ? (
                      <DeleteServiceCategoryButton categoryId={category.id} />
                    ) : (
                      <span className="px-2 py-1.5 text-xs text-muted-foreground">In use</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No service categories yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className="max-w-sm rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="mb-3 font-medium">Add category</h2>
        <ServiceCategoryForm action={createServiceCategoryAction} submitLabel="Create category" />
      </div>
    </div>
  );
}
