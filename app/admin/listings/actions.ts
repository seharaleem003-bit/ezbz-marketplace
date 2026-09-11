"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireCatalogAccess, requireAdmin } from "@/lib/auth/dal";
import { computeDealScore } from "@/lib/deal-score";
import { listingFormSchema, parsePhotoUrls } from "@/lib/validation/listing";
import { notifyPrebookWaitlist } from "@/lib/prebook-notify";
import { generateSeoCopy, isAiSeoConfigured } from "@/lib/ai-seo";
import { findDuplicateListings, type DuplicateCandidate } from "@/lib/duplicate-listings";
import { translateListing, isAiTranslateConfigured } from "@/lib/ai-translate";

export type ListingFormState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[] | undefined>;
      /**
       * Set when saving a NEW listing turned up products that look like the
       * same thing. The form shows them and asks; nothing is written until
       * the operator decides.
       */
      duplicates?: DuplicateCandidate[];
    }
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

  // Duplicate check, on create only and only until the operator has answered.
  // Runs before any write, so declining costs nothing and the form keeps
  // everything they typed. `confirmNewListing` is their explicit "yes, this
  // really is a separate product".
  if (!existingId && formData.get("confirmNewListing") !== "1") {
    const duplicates = await findDuplicateListings({
      title: data.title,
      amazonUrl: data.amazonUrl,
      slug: data.slug,
    });
    if (duplicates.length > 0) return { duplicates };
  }

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
  // the listing stopped being a pre-book — that's what triggers the waitlist —
  // and whether it has ever been published before.
  const before = existingId
    ? await prisma.listing.findUnique({
        where: { id: existingId },
        select: { isPrebook: true, publishedAt: true, title: true, description: true },
      })
    : null;
  const wasPrebook = before?.isPrebook ?? false;

  // Spanish copy, written once at save time rather than on every page view.
  // Skipped when the English text is unchanged, so editing a price doesn't pay
  // to re-translate. Best-effort like the SEO above: the storefront falls back
  // to English, so a failure costs the translation and nothing else.
  let translation: { titleEs?: string; descriptionEs?: string } = {};
  const textChanged =
    !before || before.title !== data.title || before.description !== data.description;
  if (textChanged && isAiTranslateConfigured()) {
    try {
      const es = await translateListing({ title: data.title, description: data.description });
      translation = {
        ...(es.titleEs ? { titleEs: es.titleEs } : {}),
        ...(es.descriptionEs ? { descriptionEs: es.descriptionEs } : {}),
      };
    } catch (error) {
      console.error("Translation failed; saving listing in English only", error);
    }
  }

  // First publish stamps the date; later saves leave it alone.
  const publishStamp =
    data.status === "PUBLISHED" && !before?.publishedAt ? { publishedAt: new Date() } : {};

  const listing = await prisma.$transaction(async (tx) => {
    const saved = existingId
      ? await tx.listing.update({
          where: { id: existingId },
          data: { ...listingData, ...publishStamp, ...translation },
        })
      : await tx.listing.create({ data: { ...listingData, ...publishStamp, ...translation } });

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

  // Stamp the publish date the first time it goes live, and only then —
  // re-publishing after a spell as a draft keeps the original date.
  const existing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { publishedAt: true },
  });

  const listing = await prisma.listing.update({
    where: { id: listingId },
    data: {
      status,
      ...(status === "PUBLISHED" && !existing?.publishedAt ? { publishedAt: new Date() } : {}),
    },
  });

  revalidatePath("/admin/listings");
  revalidatePath("/listings");
  revalidatePath(`/listings/${listing.slug}`);
  revalidatePath("/");
}

/**
 * Permanently removes a listing.
 *
 * Admin-only: staff build the catalogue, they don't destroy it. Delete means
 * delete, even for a listing that has sold: each order line keeps its own
 * title and price snapshot and its listing link is simply cleared
 * (OrderItem.listingId is nullable, ON DELETE SET NULL), so the sale history
 * stays intact and readable — only the "view product" link goes.
 */
export async function deleteListingAction(
  listingId: string
): Promise<{ error?: string; deleted?: boolean }> {
  await requireAdmin();

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { slug: true },
  });
  if (!listing) return { error: "That listing no longer exists." };

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

export interface BulkDeleteReport {
  deleted: number;
}

/**
 * Deletes many listings at once, admin-only. Same semantics as the single
 * delete: everything selected is removed; order lines keep their snapshots.
 */
export async function bulkDeleteListingsAction(ids: string[]): Promise<BulkDeleteReport> {
  await requireAdmin();

  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return { deleted: 0 };

  const listings = await prisma.listing.findMany({
    where: { id: { in: unique } },
    select: { id: true, slug: true },
  });
  const all = listings.map((l) => l.id);

  // Carts and wishlists block deletion and would point at nothing anyway.
  await prisma.cartItem.deleteMany({ where: { listingId: { in: all } } });
  await prisma.watch.deleteMany({ where: { listingId: { in: all } } });
  const result = await prisma.listing.deleteMany({ where: { id: { in: all } } });

  revalidatePath("/admin/listings");
  revalidatePath("/listings");
  revalidatePath("/");
  for (const l of listings) revalidatePath(`/listings/${l.slug}`);

  return { deleted: result.count };
}

export interface RestockResult {
  error?: string;
  /** Set on success, so the form can say what happened and link to it. */
  restocked?: { title: string; slug: string; id: string; newQty: number; republished: boolean };
}

/**
 * Adds stock to an existing listing instead of creating a duplicate of it.
 *
 * The whole point of the duplicate prompt: the operator has more of something
 * already in the catalogue, and a second record would split its stock, its
 * reviews and its search ranking. An archived or draft listing is republished
 * on restock, because having units of it again is precisely what makes it
 * sellable — leaving it hidden would look like the restock did nothing.
 */
export async function restockExistingListingAction(
  listingId: string,
  addQuantity: number
): Promise<RestockResult> {
  const session = await requireCatalogAccess();

  if (!Number.isInteger(addQuantity) || addQuantity < 1 || addQuantity > 10000) {
    return { error: "Enter how many units to add, as a whole number." };
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, title: true, slug: true, status: true, inventoryQty: true },
  });
  if (!listing) return { error: "That listing no longer exists." };

  // Staff can restock but not publish, so an archived listing they restock
  // stays hidden for an admin to release.
  const canPublish = session.user.role === "ADMIN";
  const republish = canPublish && listing.status !== "PUBLISHED";

  const updated = await prisma.listing.update({
    where: { id: listingId },
    data: {
      inventoryQty: { increment: addQuantity },
      ...(republish ? { status: "PUBLISHED", publishedAt: new Date() } : {}),
    },
    select: { inventoryQty: true },
  });

  revalidatePath("/admin/listings");
  revalidatePath("/listings");
  revalidatePath(`/listings/${listing.slug}`);
  revalidatePath("/");

  return {
    restocked: {
      id: listing.id,
      title: listing.title,
      slug: listing.slug,
      newQty: updated.inventoryQty,
      republished: republish,
    },
  };
}

/**
 * Live duplicate check, called as the operator types a title.
 *
 * The same detection that guards the save, surfaced early — finding out a
 * product is already listed is far more useful before filling in the rest of
 * the form than after pressing Save.
 */
export async function checkDuplicatesAction(
  title: string,
  amazonUrl?: string | null,
  excludeId?: string | null
): Promise<DuplicateCandidate[]> {
  await requireCatalogAccess();
  if (!title || title.trim().length < 6) return [];
  return findDuplicateListings({ title, amazonUrl, excludeId });
}
