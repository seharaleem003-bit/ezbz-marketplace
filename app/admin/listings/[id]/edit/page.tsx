import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { ListingForm } from "../../listing-form";
import type { ListingFormDefaults } from "../../listing-form-defaults";
import { updateListingAction } from "../../actions";

export const metadata: Metadata = {
  title: "Edit listing",
};

export const dynamic = "force-dynamic";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
      <h1 className="mb-6 text-2xl font-heading font-semibold">Edit listing</h1>
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
