import "server-only";

import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * File storage with one interface and two backends.
 *
 * Vercel Blob when BLOB_READ_WRITE_TOKEN is set, local disk otherwise. The
 * local path exists so development works with no vendor setup; it must not be
 * relied on in production, where the filesystem is ephemeral and anything
 * written disappears on the next deploy or cold start.
 *
 * `isDurableStorageConfigured()` lets callers refuse an upload rather than
 * accept a file that will silently vanish.
 */

export interface StoredFile {
  url: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

export function isDurableStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** True when writing to local disk would not survive — i.e. deployed. */
export function isEphemeralFilesystem(): boolean {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

function safeExtension(filename: string, contentType: string): string {
  const fromName = path.extname(filename).replace(/[^a-zA-Z0-9.]/g, "").slice(0, 10);
  if (fromName) return fromName;
  const guess = contentType.split("/")[1]?.replace(/[^a-z0-9]/gi, "").slice(0, 8);
  return guess ? `.${guess}` : "";
}

export async function putFile({
  buffer,
  filename,
  contentType,
  prefix,
}: {
  buffer: Buffer;
  filename: string;
  contentType: string;
  /** Folder to group files under, e.g. "messages". */
  prefix: string;
}): Promise<StoredFile> {
  const key = `${prefix}/${crypto.randomUUID()}${safeExtension(filename, contentType)}`;

  if (isDurableStorageConfigured()) {
    // Imported lazily so the package is only required when actually configured.
    const { put } = await import("@vercel/blob");
    const blob = await put(key, buffer, {
      access: "public",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return { url: blob.url, filename, contentType, sizeBytes: buffer.byteLength };
  }

  if (isEphemeralFilesystem()) {
    throw new Error(
      "File storage isn't configured. Add a Vercel Blob store and set BLOB_READ_WRITE_TOKEN."
    );
  }

  const dir = path.join(process.cwd(), "public", "uploads", prefix);
  await mkdir(dir, { recursive: true });
  const localName = key.slice(prefix.length + 1);
  await writeFile(path.join(dir, localName), buffer);

  return {
    url: `/uploads/${prefix}/${localName}`,
    filename,
    contentType,
    sizeBytes: buffer.byteLength,
  };
}
