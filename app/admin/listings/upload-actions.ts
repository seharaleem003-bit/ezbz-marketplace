"use server";

import { requireAdmin } from "@/lib/auth/dal";
import { putFile } from "@/lib/storage";

export type UploadPhotosState = { urls?: string[]; error?: string };

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const MAX_FILE_BYTES = 8 * 1024 * 1024;

/**
 * Stores listing photos through lib/storage.
 *
 * Previously wrote straight to public/uploads, which works locally and
 * silently loses every file in production — Vercel's filesystem is ephemeral,
 * so photos vanished on the next deploy and the listing was left pointing at
 * a 404. Routing through putFile means uploads land in Vercel Blob when it's
 * configured, still use local disk in development, and fail with a clear
 * message rather than accepting a file that won't survive.
 */
export async function uploadListingPhotosAction(formData: FormData): Promise<UploadPhotosState> {
  await requireAdmin();

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { error: "Choose at least one photo." };
  }

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { error: `"${file.name}" isn't a JPEG, PNG, or WebP image.` };
    }
    if (file.size > MAX_FILE_BYTES) {
      return { error: `"${file.name}" is larger than 8MB.` };
    }
  }

  const urls: string[] = [];
  try {
    for (const file of files) {
      const stored = await putFile({
        buffer: Buffer.from(await file.arrayBuffer()),
        filename: file.name,
        contentType: file.type,
        prefix: "listings",
      });
      urls.push(stored.url);
    }
  } catch (error) {
    console.error("Listing photo upload failed", error);
    return {
      error:
        "Photo storage isn't set up on this deployment yet, so the upload was refused rather than lost. Connect a Vercel Blob store to the project, then try again. Pasting image URLs still works.",
    };
  }

  return { urls };
}
