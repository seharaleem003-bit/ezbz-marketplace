import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { ListingForm } from "../listing-form";
import { AiDrafter } from "../ai-drafter";
import { EMPTY_LISTING_FORM_DEFAULTS } from "../listing-form-defaults";
import { createListingAction } from "../actions";
import { requireCatalogAccess } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "New listing",
};

export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  await requireCatalogAccess();

  const [categories, fundraisers] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.fundraiser.findMany({ where: { status: "APPROVED" }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-heading font-semibold">New listing</h1>
      <div className="max-w-2xl">
        <AiDrafter />
      </div>
      <ListingForm
        showPrebook
        action={createListingAction}
        categories={categories}
        fundraisers={fundraisers}
        defaults={{ ...EMPTY_LISTING_FORM_DEFAULTS, status: "PUBLISHED", inventoryQty: "1" }}
        submitLabel="Create listing"
        showSaveAndAddAnother
      />
    </div>
  );
}
