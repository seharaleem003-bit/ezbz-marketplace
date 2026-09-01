"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireCatalogAccess } from "@/lib/auth/dal";
import { computeDealScore } from "@/lib/deal-score";
import { listingFormSchema, parsePhotoUrls } from "@/lib/validation/listing";
import { notifyPrebookWaitlist } from "@/lib/prebook-notify";

export type ListingFormState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

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
    metaTitle: formData.get("metaTitle"),
    metaDescription: formData.get("metaDescription"),
    searchKeywords: formData.get("searchKeywords"),
    weightLb: formData.get("weightLb"),
    lengthIn: formData.get("lengthIn"),
    widthIn: formData.get("widthIn"),
    heightIn: formData.get("heightIn"),
    inventoryQty: formData.get("inventoryQty"),
    photoUrls: formData.get("photoUrls"),
    videoUrl: formData.get("videoUrl"),
    videoCaption: formData.get("videoCaption"),
    fundraiserId: formData.get("fundraiserId"),
    fulfillmentMode: formData.get("fulfillmentMode"),
    isPrebook: formData.get("isPrebook"),
  };
}

async function upsertListing(
  formData: FormData,
  existingId: string | undefined,
  adminId: string,
  role: string
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

  // Staff build the catalogue but don't decide what goes live. Enforced here
  // rather than by hiding the dropdown, because a hidden field is not a
  // permission — the form value is whatever the browser chooses to send.
  if (role === "STAFF" && data.status !== "DRAFT") {
    return {
      fieldErrors: {
        status: ["Only an admin can publish. Save as Draft and ask an admin to review it."],
      },
    };
  }

  const slugOwner = await prisma.listing.findUnique({ where: { slug: data.slug } });
  if (slugOwner && slugOwner.id !== existingId) {
    return { fieldErrors: { slug: ["That slug is already in use."] } };
  }

  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) {
    return { fieldErrors: { categoryId: ["Choose a valid category."] } };
  }

  if (data.fundraiserId) {
    const fundraiser = await prisma.fundraiser.findUnique({ where: { id: data.fundraiserId } });
    if (!fundraiser || fundraiser.status !== "APPROVED") {
      return { fieldErrors: { fundraiserId: ["Choose a valid, approved fundraiser."] } };
    }
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
    metaTitle: data.metaTitle ?? null,
    metaDescription: data.metaDescription ?? null,
    searchKeywords: data.searchKeywords ?? null,
    // Stored metric because that's what Easyship's API takes; the form
    // collects lb/in because that's what a US warehouse tape measure reads.
    weightGrams: data.weightLb !== undefined ? Math.round(data.weightLb * 453.59237) : null,
    lengthCm: data.lengthIn !== undefined ? Math.round(data.lengthIn * 2.54) : null,
    widthCm: data.widthIn !== undefined ? Math.round(data.widthIn * 2.54) : null,
    heightCm: data.heightIn !== undefined ? Math.round(data.heightIn * 2.54) : null,
    inventoryQty: data.inventoryQty,
    dealScore,
    dealScoreUpdatedAt: new Date(),
    fundraiserId: data.fundraiserId ?? null,
    fulfillmentPickup: data.fulfillmentMode === "pickup" || data.fulfillmentMode === "both",
    fulfillmentDelivery: data.fulfillmentMode === "delivery" || data.fulfillmentMode === "both",
    isPrebook: data.isPrebook,
  };

  // Captured before the write so we can tell whether this save is the moment
  // the listing stopped being a pre-book — that's what triggers the waitlist.
  const wasPrebook = existingId
    ? (await prisma.listing.findUnique({
        where: { id: existingId },
        select: { isPrebook: true },
      }))?.isPrebook ?? false
    : false;

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
          addedByAdminId: adminId,
        },
      });
    }

    return saved;
  });

  // Pre-book -> on sale is the release moment: everyone who asked to be told
  // gets their one alert. Best-effort — a mail failure shouldn't undo the save.
  if (wasPrebook && !data.isPrebook && data.status === "PUBLISHED") {
    try {
      const result = await notifyPrebookWaitlist(listing.id);
      console.info(
        `Notified ${result.emailed}/${result.total} waitlist entries for "${listing.title}".`
      );
    } catch (error) {
      console.error(`Failed to notify pre-book waitlist for ${listing.id}`, error);
    }
  }

  revalidatePath("/admin/listings");
  revalidatePath("/listings");
  revalidatePath(`/listings/${listing.slug}`);
  revalidatePath("/");
  revalidatePath("/fundraisers", "layout");

  redirect(formData.get("intent") === "another" ? "/admin/listings/new" : "/admin/listings");
}

export async function createListingAction(
  _prevState: ListingFormState,
  formData: FormData
): Promise<ListingFormState> {
  const session = await requireCatalogAccess();
  return upsertListing(formData, undefined, session.user.id, session.user.role);
}

export async function updateListingAction(
  listingId: string,
  _prevState: ListingFormState,
  formData: FormData
): Promise<ListingFormState> {
  const session = await requireCatalogAccess();
  return upsertListing(formData, listingId, session.user.id, session.user.role);
}

export async function setListingStatusAction(
  listingId: string,
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
) {
  const session = await requireCatalogAccess();
  // The status buttons on the listings table are a second route to publishing,
  // so they need the same gate as the form.
  if (session.user.role === "STAFF" && status !== "DRAFT") {
    throw new Error("Only an admin can publish or archive a listing.");
  }

  const listing = await prisma.listing.update({
    where: { id: listingId },
    data: { status },
  });

  revalidatePath("/admin/listings");
  revalidatePath("/listings");
  revalidatePath(`/listings/${listing.slug}`);
  revalidatePath("/");
}
