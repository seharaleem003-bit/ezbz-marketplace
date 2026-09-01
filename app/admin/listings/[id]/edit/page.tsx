import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { ListingForm } from "../../listing-form";
import type { ListingFormDefaults } from "../../listing-form-defaults";
import { updateListingAction } from "../../actions";
import { requireCatalogAccess } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Edit listing",
};

export const dynamic = "force-dynamic";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCatalogAccess();

  const { id } = await params;

  const [listing, categories, fundraisers] = await Promise.all([
    prisma.listing.findUnique({
      where: { id },
      include: { photos: { orderBy: { sortOrder: "asc" } }, videos: true },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.fundraiser.findMany({ where: { status: "APPROVED" }, orderBy: { name: "asc" } }),
  ]);

  if (!listing) notFound();

  const video = listing.videos[0];

  const defaults: ListingFormDefaults = {
    title: listing.title,
    slug: listing.slug,
    description: listing.description,
    categoryId: listing.categoryId,
    condition: listing.condition,
    status: listing.status,
    price: (listing.priceCents / 100).toString(),
    retailPrice: listing.retailPriceCents ? (listing.retailPriceCents / 100).toString() : "",
    amazonPrice: listing.amazonPriceCents ? (listing.amazonPriceCents / 100).toString() : "",
    amazonUrl: listing.amazonUrl ?? "",
    metaTitle: listing.metaTitle ?? "",
    metaDescription: listing.metaDescription ?? "",
    searchKeywords: listing.searchKeywords ?? "",
    weightLb: listing.weightGrams ? (listing.weightGrams / 453.59237).toFixed(2) : "",
    lengthIn: listing.lengthCm ? (listing.lengthCm / 2.54).toFixed(1) : "",
    widthIn: listing.widthCm ? (listing.widthCm / 2.54).toFixed(1) : "",
    heightIn: listing.heightCm ? (listing.heightCm / 2.54).toFixed(1) : "",
    inventoryQty: listing.inventoryQty.toString(),
    photoUrls: listing.photos.map((photo) => photo.url).join("\n"),
    videoUrl: video?.url ?? "",
    videoCaption: video?.caption ?? "",
    fundraiserId: listing.fundraiserId ?? "",
    fulfillmentPickup: listing.fulfillmentPickup,
    fulfillmentDelivery: listing.fulfillmentDelivery,
    isPrebook: listing.isPrebook,
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-heading font-semibold">Edit listing</h1>
        <div className="flex items-center gap-3 text-sm">
          {listing.status !== "PUBLISHED" ? (
            <span className="rounded-full bg-gold-500 px-2 py-0.5 text-xs font-bold uppercase text-navy-900">
              {listing.status.toLowerCase()}
            </span>
          ) : null}
          {/* Previews what's already saved; "Save & preview" below picks up
              unsaved edits first. */}
          <Link
            href={`/listings/${listing.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-navy-800 hover:underline"
          >
            Preview current version
          </Link>
        </div>
      </div>
      <ListingForm
        showPrebook
        action={updateListingAction.bind(null, listing.id)}
        categories={categories}
        fundraisers={fundraisers}
        defaults={defaults}
        submitLabel="Save changes"
      />
    </div>
  );
}
