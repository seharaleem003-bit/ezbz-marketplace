import { z } from "zod";

function optionalDollarAmount() {
  return z.preprocess((val) => {
    if (typeof val !== "string" || val.trim() === "") return undefined;
    const num = Number(val);
    return Number.isNaN(num) ? undefined : num;
  }, z.number().nonnegative("Must be zero or greater").optional());
}

/** Blank means "not measured yet"; zero is rejected since a real parcel has size. */
function optionalPositiveNumber() {
  return z.preprocess((val) => {
    if (typeof val !== "string" || val.trim() === "") return undefined;
    const num = Number(val);
    return Number.isNaN(num) ? undefined : num;
  }, z.number().positive("Must be greater than 0").optional());
}

function optionalUrl() {
  return z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? val.trim() : undefined),
    z.string().url("Enter a valid URL").optional()
  );
}

export const listingFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Slug is required")
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only"),
  description: z.string().trim().min(1, "Description is required"),
  categoryId: z.string().trim().min(1, "Category is required"),
  condition: z.enum(["NEW", "OPEN_BOX", "LIKE_NEW", "GOOD", "FAIR", "SALVAGE"]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  price: z.preprocess((val) => {
    if (typeof val !== "string" || val.trim() === "") return undefined;
    const num = Number(val);
    return Number.isNaN(num) ? undefined : num;
  }, z.number().positive("Price must be greater than 0")),
  retailPrice: optionalDollarAmount(),
  amazonPrice: optionalDollarAmount(),
  amazonUrl: optionalUrl(),
  // Capped at the lengths search engines actually render, so an over-long
  // entry is rejected at the form rather than silently truncated in results.
  metaTitle: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? val.trim() : undefined),
    z.string().max(70, "Keep the SEO title under 70 characters").optional()
  ),
  metaDescription: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? val.trim() : undefined),
    z.string().max(200, "Keep the meta description under 200 characters").optional()
  ),
  searchKeywords: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? val.trim() : undefined),
    z.string().max(500).optional()
  ),
  // Parcel measurements, entered in US units. Live Easyship rates need all
  // four; any missing one drops the whole cart back to a flat estimate
  // (see isFullyMeasured in lib/shipping.ts).
  weightLb: optionalPositiveNumber(),
  lengthIn: optionalPositiveNumber(),
  widthIn: optionalPositiveNumber(),
  heightIn: optionalPositiveNumber(),
  inventoryQty: z.preprocess((val) => {
    if (typeof val !== "string" || val.trim() === "") return 0;
    const num = Number(val);
    return Number.isNaN(num) ? 0 : num;
  }, z.number().int().nonnegative()),
  photoUrls: z.string().optional(),
  videoUrl: optionalUrl(),
  videoCaption: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? val.trim() : undefined),
    z.string().max(200).optional()
  ),
  fundraiserId: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" && val !== "none" ? val : undefined),
    z.string().optional()
  ),
  fulfillmentMode: z.enum(["delivery", "pickup", "both"]),
  isPrebook: z.preprocess((val) => val === "on", z.boolean()),
});

export type ListingFormInput = z.infer<typeof listingFormSchema>;

export function parsePhotoUrls(raw: string | undefined): { urls: string[]; error?: string } {
  const lines = (raw ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    // Either a full URL (pasted from elsewhere) or a same-origin path from
    // our own upload endpoint (see app/admin/listings/upload-actions.ts) —
    // those are intentionally relative, not absolute, so they keep working
    // regardless of what domain the app is served from.
    const isFullUrl = z.string().url().safeParse(line).success;
    const isLocalUploadPath = line.startsWith("/uploads/");
    if (!isFullUrl && !isLocalUploadPath) {
      return { urls: [], error: `"${line}" is not a valid photo URL.` };
    }
  }

  return { urls: lines };
}
