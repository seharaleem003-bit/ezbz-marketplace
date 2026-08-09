"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import {
  isEbayConfigured,
  parseEbayLegacyItemId,
  getEbayItemByLegacyId,
  mapEbayCondition,
} from "@/lib/ebay";
import { isAiExtractConfigured, extractListingFromImage } from "@/lib/ai-listing-extract";

export type ImportedListingDraft = {
  title?: string;
  description?: string;
  condition?: string;
  price?: string;
  categoryId?: string;
  photoUrls?: string;
};

export type ImportResult = { data?: ImportedListingDraft; error?: string };

async function guessCategoryId(categoryName: string | null): Promise<string | undefined> {
  if (!categoryName) return undefined;
  const categories = await prisma.category.findMany({ select: { id: true, name: true } });
  const match = categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
  return match?.id;
}

export async function importFromEbayAction(url: string): Promise<ImportResult> {
  await verifySession();

  if (!isEbayConfigured()) {
    return { error: "eBay import isn't wired up on this deployment yet — contact EZBZ support." };
  }

  const legacyItemId = parseEbayLegacyItemId(url);
  if (!legacyItemId) {
    return { error: "That doesn't look like an eBay item link." };
  }

  try {
    const item = await getEbayItemByLegacyId(legacyItemId);
    return {
      data: {
        title: item.title,
        description: item.description ?? undefined,
        condition: mapEbayCondition(item.condition),
        price: item.priceCents != null ? (item.priceCents / 100).toFixed(2) : undefined,
        photoUrls: item.imageUrls.join("\n"),
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to import from eBay." };
  }
}

export async function importFromScreenshotAction(formData: FormData): Promise<ImportResult> {
  await verifySession();

  if (!isAiExtractConfigured()) {
    return { error: "AI import isn't wired up on this deployment yet — contact EZBZ support." };
  }

  const file = formData.get("screenshot");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image first." };
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { error: "Please upload a JPEG, PNG, or WebP image." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: "Image is too large (10MB max)." };
  }

  const categories = await prisma.category.findMany({ select: { name: true } });
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const draft = await extractListingFromImage({
      imageBase64: buffer.toString("base64"),
      mediaType: file.type as "image/jpeg" | "image/png" | "image/webp",
      categoryNames: categories.map((c) => c.name),
    });

    return {
      data: {
        title: draft.title ?? undefined,
        description: draft.description ?? undefined,
        condition: draft.condition ?? undefined,
        price: draft.priceCents != null ? (draft.priceCents / 100).toFixed(2) : undefined,
        categoryId: await guessCategoryId(draft.categoryName),
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to read that image." };
  }
}
