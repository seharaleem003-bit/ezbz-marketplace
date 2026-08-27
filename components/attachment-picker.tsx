"use client";

import { useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";

import {
  MAX_ATTACHMENTS_PER_MESSAGE,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/attachments.shared";

/**
 * "Attach" control for message forms.
 *
 * Holds its own DataTransfer list so files can be removed after picking —
 * a bare file input only supports replacing the whole selection, which means
 * one wrong file forces you to re-pick them all.
 */
export function AttachmentPicker({ name = "attachments" }: { name?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  function sync(next: File[]) {
    setFiles(next);
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    next.forEach((f) => dt.items.add(f));
    inputRef.current.files = dt.files;
  }

  function onPick(picked: FileList | null) {
    if (!picked) return;
    setError(null);
    const merged = [...files, ...Array.from(picked)];

    if (merged.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      setError(`Up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`);
      return;
    }
    const tooBig = merged.find((f) => f.size > MAX_ATTACHMENT_BYTES);
    if (tooBig) {
      setError(`"${tooBig.name}" is larger than 10MB.`);
      return;
    }
    sync(merged);
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        name={name}
        multiple
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
        onChange={(e) => onPick(e.target.files)}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex w-fit items-center gap-1.5 rounded-full border border-input px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:border-navy-800/40 hover:text-foreground"
      >
        <Paperclip className="size-4" />
        Attach files
      </button>

      {files.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 rounded-md bg-muted/60 px-2 py-1 text-xs"
            >
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="shrink-0 text-muted-foreground">
                {(f.size / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => sync(files.filter((_, idx) => idx !== i))}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
