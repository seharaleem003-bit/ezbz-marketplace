import "server-only";

import sharp from "sharp";

/**
 * Shrinks a product photo before it is stored.
 *
 * Vercel's image optimizer is billed per transformation and this account has
 * exhausted its allowance, so next/image runs with `unoptimized: true` and
 * browsers download whatever is in the blob store verbatim. Supplier photos
 * arrive at 1500px and 150-700KB, which is several times more than any slot
 * on the site displays. Resizing once at upload costs nothing per request and
 * beats the optimizer, which would redo the work for every new size.
 *
 * 900px wide covers the largest slot (the product gallery) at 2x on the
 * common card widths. WebP because it keeps transparency, unlike JPEG, and
 * compresses product shots substantially better.
 */

export const MAX_PHOTO_WIDTH = 900;
const WEBP_QUALITY = 80;

/** Below this a re-encode costs quality and saves nothing worth having. */
const LEAVE_ALONE_BYTES = 90_000;

const OPTIMIZABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/tiff"]);

export interface OptimizedImage {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

/**
 * Returns a resized WebP version, or the input untouched when shrinking it
 * would be pointless or impossible. Never throws: a photo that sharp cannot
 * read is still a photo the operator wants stored, so it passes through.
 */
export async function optimizeProductImage(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<OptimizedImage> {
  const unchanged = { buffer, contentType, filename };
  if (!OPTIMIZABLE.has(contentType)) return unchanged;

  try {
    const meta = await sharp(buffer).metadata();

    // Animated GIF/WebP would lose its frames on a plain resize.
    if ((meta.pages ?? 1) > 1) return unchanged;
    if ((meta.width ?? 0) <= MAX_PHOTO_WIDTH && buffer.length < LEAVE_ALONE_BYTES) return unchanged;

    const out = await sharp(buffer)
      .rotate() // apply EXIF orientation before resizing, or portraits come out sideways
      .resize({ width: MAX_PHOTO_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    // A re-encode that grew the file is not an optimisation.
    if (out.length >= buffer.length) return unchanged;

    return {
      buffer: out,
      contentType: "image/webp",
      filename: filename.replace(/\.[^.]+$/, "") + ".webp",
    };
  } catch (error) {
    console.error("Photo optimisation failed; storing the original", error);
    return unchanged;
  }
}
