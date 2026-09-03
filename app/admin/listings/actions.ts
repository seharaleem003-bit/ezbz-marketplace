"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireCatalogAccess, requireAdmin } from "@/lib/auth/dal";
import { computeDealScore } from "@/lib/deal-score";
import { listingFormSchema, parsePhotoUrls } from "@/lib/validation/listing";
import { notifyPrebookWaitlist } from "@/lib/prebook-notify";
import { generateSeoCopy, isAiSeoConfigured } from "@/lib/ai-seo";

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

  // Slugs are unique across every listing, archived and draft included, so
  // re-adding a product that once existed collides with its ghost. On create
  // that's not the operator's problem to solve — suffix it, as the importer
  // does. On edit a collision is a real conflict with a different listing and
  // still needs a human to pick a name.
  let slug = data.slug;
  const slugOwner = await prisma.listing.findUnique({ where: { slug } });
  if (slugOwner && slugOwner.id !== existingId) {
    if (existingId) {
      return { fieldErrors: { slug: ["That slug is already in use by another listing."] } };
    }
    const taken = new Set(
      (
        await prisma.listing.findMany({
          where: { slug: { startsWith: `${data.slug}-` } },
          select: { slug: true },
        })
      ).map((l) => l.slug)
    );
    let n = 2;
    while (taken.has(`${data.slug}-${n}`)) n++;
    slug = `${data.slug}-${n}`;
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

  // SEO is generated when it wasn't supplied, so a listing added by hand can't
  // ship with empty tags. Anything typed into the form wins — this fills gaps,
  // it doesn't overwrite an operator's wording. Best-effort: a model failure
  // must not block saving the listing.
  let seo = {
    metaTitle: data.metaTitle ?? null,
    metaDescription: data.metaDescription ?? null,
    searchKeywords: data.searchKeywords ?? null,
  };
  if ((!seo.metaTitle || !seo.metaDescription || !seo.searchKeywords) && isAiSeoConfigured()) {
    try {
      const generated = await generateSeoCopy({
        title: data.title,
        description: data.description,
        categoryName: category.name,
        condition: data.condition,
        priceCents,
      });
      seo = {
        metaTitle: seo.metaTitle ?? generated.metaTitle,
        metaDescription: seo.metaDescription ?? generated.metaDescription,
        searchKeywords: seo.searchKeywords ?? generated.searchKeywords,
      };
    } catch (error) {
      console.error("SEO generation failed; saving listing without it", error);
    }
  }

  const listingData = {
    title: data.title,
    slug,
    description: data.description,
    categoryId: data.categoryId,
    condition: data.condition,
    status: data.status,
    priceCents,
    retailPriceCents,
    amazonPriceCents,
    amazonUrl: data.amazonUrl ?? null,
    amazonPriceCheckedAt: amazonPriceCents ? new Date() : null,
    metaTitle: seo.metaTitle,
    metaDescription: seo.metaDescription,
    searchKeywords: seo.searchKeywords,
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

  const intent = formData.get("intent");
  redirect(
    intent === "another"
      ? "/admin/listings/new"
      : // "Save & preview" lands on the live product page. A draft is only
        // visible there to admin/staff, so this shows exactly what a shopper
        // would see without exposing it to one.
        intent === "preview"
        ? `/listings/${listing.slug}`
        : "/admin/listings"
  );
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

/**
 * Permanently removes a listing.
 *
 * Admin-only: staff build the catalogue, they don't destroy it. A listing that
 * appears on any order is refused rather than deleted — the order records the
 * sale and deleting the listing would take that history with it. Archiving
 * hides it from shoppers and keeps the record, which is what's wanted in
 * practice.
 */
export async function deleteListingAction(
  listingId: string
): Promise<{ error?: string; deleted?: boolean }> {
  await requireAdmin();

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      title: true,
      slug: true,
      _count: { select: { orderItems: true } },
    },
  });
  if (!listing) return { error: "That listing no longer exists." };

  if (listing._count.orderItems > 0) {
    return {
      error: `"${listing.title}" appears on ${listing._count.orderItems} order${
        listing._count.orderItems === 1 ? "" : "s"
      }, so deleting it would break that order history. Archive it instead — it disappears from the shop either way.`,
    };
  }

  // Carts and wishlists block the delete and would point at nothing anyway.
  await prisma.cartItem.deleteMany({ where: { listingId } });
  await prisma.watch.deleteMany({ where: { listingId } });
  await prisma.listing.delete({ where: { id: listingId } });

  revalidatePath("/admin/listings");
  revalidatePath("/listings");
  revalidatePath(`/listings/${listing.slug}`);
  revalidatePath("/");

  return { deleted: true };
}
