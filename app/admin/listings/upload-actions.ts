"use server";

import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { requireAdmin } from "@/lib/auth/dal";

export type UploadPhotosState = { urls?: string[]; error?: string };

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_FILE_BYTES = 8 * 1024 * 1024;

// Saves to public/uploads/listings, served directly by Next's static file
// handling — zero new vendor setup, works immediately for local use. This
// is a local-disk stopgap: it will NOT survive a real deployment (most
// hosts, including Vercel, run serverless functions with an ephemeral or
// read-only filesystem), so before going live this needs to move to real
// object storage (Vercel Blob, S3, Cloudflare R2, etc.) — swap out just
// this file's write step, callers don't need to change.
export async function uploadListingPhotosAction(formData: FormData): Promise<UploadPhotosState> {
  await requireAdmin();

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { error: "Choose at least one photo." };
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "listings");
  await mkdir(uploadDir, { recursive: true });

  const urls: string[] = [];
  for (const file of files) {
    const extension = EXTENSION_BY_TYPE[file.type];
    if (!extension) {
      return { error: `"${file.name}" isn't a JPEG, PNG, or WebP image.` };
    }
    if (file.size > MAX_FILE_BYTES) {
      return { error: `"${file.name}" is larger than 8MB.` };
    }

    const filename = `${crypto.randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);
    urls.push(`/uploads/listings/${filename}`);
  }

  return { urls };
}
