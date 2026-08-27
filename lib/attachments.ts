import "server-only";

import { putFile, type StoredFile } from "@/lib/storage";

/**
 * Validation and storage for message attachments.
 *
 * Buyers send photos of damage, receipts, and the occasional PDF, so this
 * allows images plus a small set of document types rather than images only.
 * Anything executable is refused: the list is an allowlist, not a blocklist,
 * because a blocklist of dangerous extensions is a game you lose.
 */

export {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_MESSAGE,
} from "@/lib/attachments.shared";
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_MESSAGE,
} from "@/lib/attachments.shared";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export function isImageType(contentType: string): boolean {
  return contentType.startsWith("image/");
}

export type AttachmentResult =
  | { files: StoredFile[]; error?: undefined }
  | { files?: undefined; error: string };

export async function storeMessageAttachments(files: File[]): Promise<AttachmentResult> {
  const usable = files.filter((f) => f.size > 0);
  if (usable.length === 0) return { files: [] };

  if (usable.length > MAX_ATTACHMENTS_PER_MESSAGE) {
    return { error: `Attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.` };
  }

  for (const file of usable) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return { error: `"${file.name}" isn't a supported file type.` };
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return { error: `"${file.name}" is larger than 10MB.` };
    }
  }

  const stored: StoredFile[] = [];
  for (const file of usable) {
    stored.push(
      await putFile({
        buffer: Buffer.from(await file.arrayBuffer()),
        filename: file.name,
        contentType: file.type,
        prefix: "messages",
      })
    );
  }
  return { files: stored };
}
