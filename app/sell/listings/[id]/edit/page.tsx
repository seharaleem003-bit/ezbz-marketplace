import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { ListingForm } from "@/app/admin/listings/listing-form";
import type { ListingFormDefaults } from "@/app/admin/listings/listing-form-defaults";
import { updateSellerListingAction } from "../../actions";

export const metadata: Metadata = {
  title: "Edit listing",
};

export const dynamic = "force-dynamic";

export default async function EditSellerListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await verifySession();
  const seller = await prisma.seller.findUnique({ where: { userId: session.user.id } });
  if (!seller) redirect("/sell");

  const [listing, categories] = await Promise.all([
    prisma.listing.findUnique({
      where: { id },
      include: { photos: { orderBy: { sortOrder: "asc" } }, videos: true },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!listing || listing.sellerId !== seller.id) notFound();

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
    fundraiserId: "",
    fulfillmentPickup: listing.fulfillmentPickup,
    fulfillmentDelivery: listing.fulfillmentDelivery,
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-heading font-semibold">Edit listing</h1>
      <ListingForm
        action={updateSellerListingAction.bind(null, listing.id)}
        categories={categories}
        defaults={defaults}
        submitLabel="Save changes"
      />
    </div>
  );
}
