"use server";

import { prisma } from "@/lib/prisma";
import { requireCatalogAccess } from "@/lib/auth/dal";
import { isAiEnrichConfigured, enrichListingFromImage } from "@/lib/ai-listing-enrich";

export type AiDraft = {
  title?: string;
  description?: string;
  condition?: string;
  categoryId?: string;
  metaTitle?: string;
  metaDescription?: string;
  searchKeywords?: string;
  lowConfidence?: boolean;
};

export type AiDraftResult = { data?: AiDraft; error?: string };

const ALLOWED = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Drafts a full listing (copy + SEO) from an uploaded product photo.
 *
 * Admin-only: it spends money on an API call per invocation, so it must not be
 * reachable by anyone who can merely reach the route.
 */
export async function draftListingFromImageAction(formData: FormData): Promise<AiDraftResult> {
  await requireCatalogAccess();

  if (!isAiEnrichConfigured()) {
    return { error: "ANTHROPIC_API_KEY isn't set on this deployment." };
  }

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a product image first." };
  }
  if (!ALLOWED.includes(file.type as (typeof ALLOWED)[number])) {
    return { error: "Upload a JPEG, PNG, or WebP image." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Image is too large (10MB max)." };
  }

  const hint = typeof formData.get("hint") === "string" ? String(formData.get("hint")) : undefined;
  const categories = await prisma.category.findMany({ select: { id: true, name: true } });
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const draft = await enrichListingFromImage({
      imageBase64: buffer.toString("base64"),
      mediaType: file.type as (typeof ALLOWED)[number],
      categoryNames: categories.map((c) => c.name),
      hint: hint?.trim() || undefined,
    });

    // Features read better appended to the description than dropped, and the
    // listing form has no separate field for them.
    const description = [
      draft.description,
      draft.features.length > 0 ? draft.features.map((f) => `• ${f}`).join("\n") : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const category = draft.categoryName
      ? categories.find((c) => c.name.toLowerCase() === draft.categoryName!.toLowerCase())
      : undefined;

    return {
      data: {
        title: draft.title ?? undefined,
        description: description || undefined,
        condition: draft.condition ?? undefined,
        categoryId: category?.id,
        metaTitle: draft.metaTitle ?? undefined,
        metaDescription: draft.metaDescription ?? undefined,
        searchKeywords: draft.searchKeywords.join(", ") || undefined,
        lowConfidence: draft.lowConfidence,
      },
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Couldn't read that image.",
    };
  }
}
