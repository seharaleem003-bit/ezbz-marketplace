"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { computeDealScore } from "@/lib/deal-score";
import { listingFormSchema, parsePhotoUrls } from "@/lib/validation/listing";

export type ListingFormState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

async function requirePostEligibleSeller() {
  const session = await verifySession();
  const seller = await prisma.seller.findUnique({ where: { userId: session.user.id } });
  if (
    !seller ||
    seller.status !== "APPROVED" ||
    !seller.stripeOnboardingComplete ||
    !seller.identityVerifiedAt
  ) {
    redirect("/sell");
  }
  return seller;
}

function readFormValues(formData: FormData) {
  return {
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    condition: formData.get("condition"),
    status: formData.get("status"),
    price: formData.get("price"),
    retailPrice: formData.get("retailPrice"),
    amazonPrice: formData.get("amazonPrice"),
    amazonUrl: formData.get("amazonUrl"),
    inventoryQty: formData.get("inventoryQty"),
    photoUrls: formData.get("photoUrls"),
    videoUrl: formData.get("videoUrl"),
    videoCaption: formData.get("videoCaption"),
    fulfillmentMode: formData.get("fulfillmentMode"),
  };
}

async function upsertSellerListing(
  formData: FormData,
  existingId: string | undefined,
  sellerId: string
): Promise<ListingFormState> {
  const parsed = listingFormSchema.safeParse(readFormValues(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { urls: photoUrls, error: photoError } = parsePhotoUrls(parsed.data.photoUrls);
  if (photoError) {
    return { error: photoError };
  }

  const data = parsed.data;

  if (existingId) {
    const existing = await prisma.listing.findUnique({ where: { id: existingId } });
    if (!existing || existing.sellerId !== sellerId) {
      return { error: "You don't have permission to edit that listing." };
    }
  }

  const slugOwner = await prisma.listing.findUnique({ where: { slug: data.slug } });
  if (slugOwner && slugOwner.id !== existingId) {
    return { fieldErrors: { slug: ["That slug is already in use."] } };
  }

  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) {
    return { fieldErrors: { categoryId: ["Choose a valid category."] } };
  }

  const priceCents = Math.round(data.price * 100);
  const retailPriceCents = data.retailPrice !== undefined ? Math.round(data.retailPrice * 100) : null;
  const amazonPriceCents = data.amazonPrice !== undefined ? Math.round(data.amazonPrice * 100) : null;

  const dealScore = computeDealScore({
    priceCents,
    retailPriceCents,
    amazonPriceCents,
    condition: data.condition,
  });

  const listingData = {
    title: data.title,
    slug: data.slug,
    description: data.description,
    categoryId: data.categoryId,
    condition: data.condition,
    status: data.status,
    priceCents,
    retailPriceCents,
    amazonPriceCents,
    amazonUrl: data.amazonUrl ?? null,
    amazonPriceCheckedAt: amazonPriceCents ? new Date() : null,
    inventoryQty: data.inventoryQty,
    dealScore,
    dealScoreUpdatedAt: new Date(),
    fulfillmentPickup: data.fulfillmentMode === "pickup" || data.fulfillmentMode === "both",
    fulfillmentDelivery: data.fulfillmentMode === "delivery" || data.fulfillmentMode === "both",
    sellerId,
  };

  const listing = await prisma.$transaction(async (tx) => {
    const saved = existingId
      ? await tx.listing.update({ where: { id: existingId }, data: listingData })
      : await tx.listing.create({ data: listingData });

    await tx.listingPhoto.deleteMany({ where: { listingId: saved.id } });
    if (photoUrls.length > 0) {
      await tx.listingPhoto.createMany({
        data: photoUrls.map((url, index) => ({
          listingId: saved.id,
          url,
          altText: data.title,
          sortOrder: index,
        })),
      });
    }

    await tx.listingVideo.deleteMany({ where: { listingId: saved.id } });
    if (data.videoUrl) {
      await tx.listingVideo.create({
        data: {
          listingId: saved.id,
          url: data.videoUrl,
          caption: data.videoCaption ?? null,
        },
      });
    }

    return saved;
  });

  revalidatePath("/sell/listings");
  revalidatePath("/listings");
  revalidatePath(`/listings/${listing.slug}`);
  revalidatePath("/");

  redirect("/sell/listings");
}

export async function createSellerListingAction(
  _prevState: ListingFormState,
  formData: FormData
): Promise<ListingFormState> {
  const seller = await requirePostEligibleSeller();
  return upsertSellerListing(formData, undefined, seller.id);
}

export async function updateSellerListingAction(
  listingId: string,
  _prevState: ListingFormState,
  formData: FormData
): Promise<ListingFormState> {
  const seller = await requirePostEligibleSeller();
  return upsertSellerListing(formData, listingId, seller.id);
}

export async function setSellerListingStatusAction(
  listingId: string,
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
) {
  const seller = await requirePostEligibleSeller();

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== seller.id) {
    throw new Error("You don't have permission to edit that listing.");
  }

  await prisma.listing.update({ where: { id: listingId }, data: { status } });

  revalidatePath("/sell/listings");
  revalidatePath("/listings");
  revalidatePath(`/listings/${listing.slug}`);
  revalidatePath("/");
}
