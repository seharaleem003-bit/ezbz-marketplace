"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireCatalogAccess } from "@/lib/auth/dal";
import { parseCatalogFile, type ImportRow } from "@/lib/catalog-import";
import { categorizeProducts, isAiCategorizeConfigured } from "@/lib/ai-categorize";
import { type CategoryNode } from "@/lib/listings";
import { computeDealScore } from "@/lib/deal-score";
import { putFile } from "@/lib/storage";

export interface ImportReport {
  imported: number;
  skipped: { row: number; title: string; reason: string }[];
  createdCategories: string[];
  placements: { title: string; category: string; isNew: boolean; confidence: string }[];
}

export type ImportState = { report?: ImportReport; error?: string } | undefined;

const MAX_BYTES = 5 * 1024 * 1024;
// One unit unless the sheet's Quantity column says otherwise.
const DEFAULT_INVENTORY = 1;

function slugify(value: string, max = 70) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

/** Full "Parent > Child" path for every category, for the model to choose from. */
function buildPaths(tree: CategoryNode[]) {
  const byId = new Map(tree.map((c) => [c.id, c]));
  return tree.map((c) => {
    const parts = [c.name];
    let parentId = c.parentId;
    while (parentId) {
      const parent = byId.get(parentId);
      if (!parent) break;
      parts.unshift(parent.name);
      parentId = parent.parentId;
    }
    return { slug: c.slug, path: parts.join(" > ") };
  });
}

export async function importCatalogAction(
  _prevState: ImportState,
  formData: FormData
): Promise<ImportState> {
  const session = await requireCatalogAccess();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a spreadsheet first." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "That file is larger than 5MB." };
  }
  if (!isAiCategorizeConfigured()) {
    return { error: "ANTHROPIC_API_KEY isn't set, so products can't be categorised." };
  }

  // Staff imports always land as drafts for an admin to review, whatever the
  // checkbox said.
  const publish = formData.get("publish") === "on" && session.user.role !== "STAFF";

  const { rows, error } = await parseCatalogFile(
    Buffer.from(await file.arrayBuffer()),
    file.name
  );
  if (error) return { error };
  if (rows.length === 0) return { error: "No product rows found in that file." };

  const skipped: ImportReport["skipped"] = [];
  const usable: ImportRow[] = [];
  for (const row of rows) {
    if (row.problem) {
      skipped.push({ row: row.rowNumber, title: row.title, reason: row.problem });
      continue;
    }
    usable.push(row);
  }
  if (usable.length === 0) {
    return { error: "Every row was missing a usable price — check the price column." };
  }

  const tree = (await prisma.category.findMany({
    select: { id: true, slug: true, name: true, parentId: true, sortOrder: true },
  })) as CategoryNode[];

  let suggestions;
  try {
    suggestions = await categorizeProducts({
      products: usable.map((r) => ({
        rowNumber: r.rowNumber,
        title: r.title,
        description: r.description,
      })),
      categoryPaths: buildPaths(tree),
    });
  } catch (e) {
    console.error("Categorisation failed", e);
    return { error: "Couldn't categorise these products. Try again in a moment." };
  }

  const byRow = new Map(suggestions.map((s) => [s.rowNumber, s]));
  const catIdBySlug = new Map(tree.map((c) => [c.slug, c.id]));
  const createdCategories: string[] = [];

  // Create every proposed category once, before any listing needs it.
  for (const suggestion of suggestions) {
    const proposed = suggestion.newCategory;
    if (!proposed) continue;
    const slug = slugify(proposed.name);
    if (!slug || catIdBySlug.has(slug)) continue;

    const parentId = proposed.parentSlug ? catIdBySlug.get(proposed.parentSlug) ?? null : null;
    const created = await prisma.category.create({
      data: { slug, name: proposed.name, parentId, sortOrder: 50 },
    });
    catIdBySlug.set(slug, created.id);

    const parentName = proposed.parentSlug
      ? tree.find((c) => c.slug === proposed.parentSlug)?.name
      : null;
    createdCategories.push(parentName ? `${parentName} > ${proposed.name}` : proposed.name);
  }

  // Fallback for anything the model didn't return — never drop a product.
  let fallbackId = catIdBySlug.get("uncategorised");
  const ensureFallback = async () => {
    if (fallbackId) return fallbackId;
    const created = await prisma.category.create({
      data: { slug: "uncategorised", name: "Uncategorised", sortOrder: 99 },
    });
    fallbackId = created.id;
    catIdBySlug.set("uncategorised", created.id);
    createdCategories.push("Uncategorised");
    return created.id;
  };

  const existingSlugs = new Set(
    (await prisma.listing.findMany({ select: { slug: true } })).map((l) => l.slug)
  );

  const placements: ImportReport["placements"] = [];
  let imported = 0;

  for (const row of usable) {
    const suggestion = byRow.get(row.rowNumber);
    let categoryId =
      suggestion?.existingSlug != null ? catIdBySlug.get(suggestion.existingSlug) : undefined;
    if (!categoryId && suggestion?.newCategory) {
      categoryId = catIdBySlug.get(slugify(suggestion.newCategory.name));
    }
    const isNew = Boolean(suggestion?.newCategory);
    if (!categoryId) categoryId = await ensureFallback();

    let slug = slugify(row.title);
    if (!slug) slug = `listing-${row.rowNumber}`;
    let suffix = 2;
    const base = slug;
    while (existingSlugs.has(slug)) slug = `${base}-${suffix++}`;
    existingSlugs.add(slug);

    const description = row.colour
      ? `${row.description}\n\nColour: ${row.colour}`
      : row.description;

    // A row with no usable image URL but a picture pasted into the sheet gets
    // that picture uploaded to storage. URLs win when both exist — they cost
    // nothing to store and are what the supplier deliberately provided.
    const photoUrls = [...row.imageUrls];
    if (photoUrls.length === 0 && row.embeddedImages.length > 0) {
      for (const img of row.embeddedImages) {
        try {
          const stored = await putFile({
            buffer: img.buffer,
            filename: img.filename,
            contentType: img.contentType,
            prefix: "listings",
          });
          photoUrls.push(stored.url);
        } catch (error) {
          // Losing a photo shouldn't lose the product; the placeholder in the
          // admin table makes the gap visible so it can be fixed by hand.
          console.error(`Embedded image upload failed for row ${row.rowNumber}`, error);
        }
      }
    }

    const priceCents = row.priceCents as number;
    const condition = (row.condition ?? "NEW") as "NEW";

    await prisma.listing.create({
      data: {
        slug,
        title: row.title,
        description,
        categoryId,
        condition,
        status: publish ? "PUBLISHED" : "DRAFT",
        publishedAt: publish ? new Date() : null,
        priceCents,
        retailPriceCents: row.retailPriceCents,
        amazonPriceCents: row.amazonPriceCents,
        amazonUrl: row.amazonUrl,
        // Only meaningful once a comparison price exists; without one the
        // badge and Deal Score have nothing to measure against.
        amazonPriceCheckedAt: row.amazonPriceCents ? new Date() : null,
        // Written by the same pass that categorised the product, so an
        // imported listing arrives search-ready instead of with empty tags.
        metaTitle: suggestion?.metaTitle ?? null,
        metaDescription: suggestion?.metaDescription ?? null,
        searchKeywords: suggestion?.searchKeywords ?? null,
        dealScore: computeDealScore({
          priceCents,
          retailPriceCents: row.retailPriceCents,
          amazonPriceCents: row.amazonPriceCents,
          condition,
        }),
        dealScoreUpdatedAt: new Date(),
        // Metric in the database because that's what Easyship takes; the
        // sheet is in lb/in because that's what a warehouse tape measure reads.
        weightGrams: row.weightLb != null ? Math.round(row.weightLb * 453.59237) : null,
        lengthCm: row.lengthIn != null ? Math.round(row.lengthIn * 2.54) : null,
        widthCm: row.widthIn != null ? Math.round(row.widthIn * 2.54) : null,
        heightCm: row.heightIn != null ? Math.round(row.heightIn * 2.54) : null,
        inventoryQty: row.quantity ?? DEFAULT_INVENTORY,
        photos: photoUrls.length
          ? {
              create: photoUrls.map((url, i) => ({
                url,
                altText: row.title.slice(0, 120),
                sortOrder: i,
              })),
            }
          : undefined,
      },
    });
    imported++;

    const categoryName =
      [...catIdBySlug.entries()].find(([, id]) => id === categoryId)?.[0] ?? "?";
    placements.push({
      title: row.title.slice(0, 60),
      category: categoryName,
      isNew,
      confidence: suggestion?.confidence ?? "low",
    });
  }

  revalidatePath("/admin/listings");
  revalidatePath("/listings");

  return { report: { imported, skipped, createdCategories, placements } };
}

