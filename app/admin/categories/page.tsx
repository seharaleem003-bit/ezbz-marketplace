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
import { CategoryForm } from "./category-form";
import { createCategoryAction } from "./actions";
import { DeleteCategoryButton } from "./delete-category-button";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Categories",
};

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireAdmin();

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { listings: true } } },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-heading font-semibold">Categories</h1>

      <div className="mb-6 overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Listings</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                <TableCell>{category._count.listings}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/admin/categories/${category.id}/edit`} />}
                    >
                      Edit
                    </Button>
                    {category._count.listings === 0 ? (
                      <DeleteCategoryButton categoryId={category.id} />
                    ) : (
                      <span className="px-2 py-1.5 text-xs text-muted-foreground">In use</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No categories yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className="max-w-sm rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="mb-3 font-medium">Add category</h2>
        <CategoryForm action={createCategoryAction} submitLabel="Create category" />
      </div>
    </div>
  );
}
