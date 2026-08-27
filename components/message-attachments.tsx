import Image from "next/image";
import { FileText } from "lucide-react";

export interface AttachmentView {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Attachments under a message: images preview inline, everything else is a
 * download row. Opened in a new tab with `rel="noreferrer"` — these are files
 * one user sent another, so they are treated as untrusted content.
 */
export function MessageAttachments({ attachments }: { attachments: AttachmentView[] }) {
  if (attachments.length === 0) return null;

  const images = attachments.filter((a) => a.contentType.startsWith("image/"));
  const files = attachments.filter((a) => !a.contentType.startsWith("image/"));

  return (
    <div className="mt-2 flex flex-col gap-2">
      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {images.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noreferrer noopener"
              className="relative size-24 overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10 transition hover:ring-navy-800/40"
            >
              <Image
                src={a.url}
                alt={a.filename}
                fill
                sizes="96px"
                className="object-cover"
                unoptimized
              />
            </a>
          ))}
        </div>
      ) : null}

      {files.map((a) => (
        <a
          key={a.id}
          href={a.url}
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center gap-2 rounded-md bg-muted/60 px-2 py-1.5 text-xs hover:bg-muted"
        >
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{a.filename}</span>
          <span className="shrink-0 text-muted-foreground">{formatSize(a.sizeBytes)}</span>
        </a>
      ))}
    </div>
  );
}
