"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Link2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { uploadListingPhotosAction } from "./upload-actions";

/**
 * Photo picker for the listing form.
 *
 * The browser's bare <input type="file"> renders as the words "Choose Files /
 * No file chosen", which reads as a status line, not a control — an admin
 * looking for "upload photo" scrolled straight past it. So the real input is
 * hidden and a proper button, a drop zone, and a paste-a-URL fallback stand
 * in for it. Same server action underneath.
 */
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
  const [dragging, setDragging] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [pastedUrl, setPastedUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(fileList: FileList | File[] | null) {
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0) return;
    setError(null);

    const formData = new FormData();
    files.forEach((file) => formData.append("photos", file));

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

  function addPastedUrl() {
    const trimmed = pastedUrl.trim();
    if (!trimmed) return;
    if (!/^https?:\/\//i.test(trimmed)) {
      setError("Paste a full image link starting with https://");
      return;
    }
    setError(null);
    setUrls((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setPastedUrl("");
    setUrlMode(false);
  }

  function removeAt(index: number) {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function makeCover(index: number) {
    setUrls((prev) => [prev[index], ...prev.filter((_, i) => i !== index)]);
  }

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={urls.join("\n")} />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        disabled={isPending}
      />

      {urls.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {urls.map((url, index) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-lg bg-white ring-1 ring-foreground/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded file, doesn't need the optimization pipeline */}
              <img src={url} alt="" className="size-full object-contain p-1" />
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                aria-label="Remove photo"
              >
                <X className="size-3.5" />
              </button>
              {index === 0 ? (
                <span className="absolute bottom-1 left-1 rounded bg-navy-800 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Cover
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeCover(index)}
                  className="absolute bottom-1 left-1 hidden rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white group-hover:block"
                >
                  Make cover
                </button>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {/* Drop zone doubles as the click target, so there's one big obvious
          place to put a photo whether you drag or click. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        aria-disabled={isPending}
        className={[
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
          dragging
            ? "border-navy-800 bg-navy-800/5"
            : "border-foreground/20 bg-muted/40 hover:border-navy-800/60 hover:bg-muted/70",
          isPending ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      >
        <ImagePlus className="size-7 text-navy-800" />
        <div className="text-sm">
          <span className="font-medium text-navy-800">
            {isPending ? "Uploading…" : urls.length === 0 ? "Upload photos" : "Add more photos"}
          </span>
          <span className="text-muted-foreground"> or drag and drop here</span>
        </div>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG, or WebP · 8MB max each · first photo is the cover
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
        >
          <Upload className="size-4" />
          {isPending ? "Uploading…" : "Upload photos"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setUrlMode((v) => !v)}
        >
          <Link2 className="size-4" />
          Paste image link
        </Button>
      </div>

      {urlMode ? (
        <div className="flex gap-2">
          <input
            type="url"
            value={pastedUrl}
            onChange={(e) => setPastedUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPastedUrl();
              }
            }}
            placeholder="https://…/photo.jpg"
            className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
          />
          <Button type="button" size="sm" variant="secondary" onClick={addPastedUrl}>
            Add
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
