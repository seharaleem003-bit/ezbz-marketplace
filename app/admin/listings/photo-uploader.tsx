"use client";

import { useRef, useState, useTransition } from "react";
import { X } from "lucide-react";

import { uploadListingPhotosAction } from "./upload-actions";

export function PhotoUploader({
  name = "photoUrls",
  defaultUrls = [],
}: {
  name?: string;
  defaultUrls?: string[];
}) {
  const [urls, setUrls] = useState<string[]>(defaultUrls);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const formData = new FormData();
    Array.from(fileList).forEach((file) => formData.append("photos", file));

    startTransition(async () => {
      const result = await uploadListingPhotosAction(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.urls) setUrls((prev) => [...prev, ...result.urls!]);
    });

    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(index: number) {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={urls.join("\n")} />

      {urls.length > 0 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {urls.map((url, index) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- locally-uploaded file, doesn't need the optimization pipeline */}
              <img src={url} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="absolute right-1 top-1 hidden size-5 items-center justify-center rounded-full bg-black/70 text-white group-hover:flex"
                aria-label="Remove photo"
              >
                <X className="size-3" />
              </button>
              {index === 0 ? (
                <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                  Cover
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="text-sm"
          disabled={isPending}
        />
        {isPending ? <span className="text-xs text-muted-foreground">Uploading…</span> : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <p className="text-xs text-muted-foreground">
        First photo is the cover image. JPEG, PNG, or WebP — 8MB max each.
      </p>
    </div>
  );
}
