"use client";

import { useRef, useState, useTransition } from "react";

import { importFromEbayAction, importFromScreenshotAction } from "./import-actions";
import { ListingForm } from "@/app/admin/listings/listing-form";
import {
  EMPTY_LISTING_FORM_DEFAULTS,
  type ListingFormDefaults,
} from "@/app/admin/listings/listing-form-defaults";
import type { ListingFormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ImportPanel({
  action,
  categories,
}: {
  action: (prevState: ListingFormState, formData: FormData) => Promise<ListingFormState>;
  categories: { id: string; name: string }[];
}) {
  const [ebayUrl, setEbayUrl] = useState("");
  const [isEbayPending, startEbayTransition] = useTransition();
  const [ebayError, setEbayError] = useState<string | null>(null);

  const [isScreenshotPending, startScreenshotTransition] = useTransition();
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bumping this key forces ListingForm to fully remount, which is what
  // makes its uncontrolled inputs' defaultValue actually re-apply — editing
  // `defaults` alone wouldn't touch already-mounted inputs.
  const [formKey, setFormKey] = useState(0);
  const [defaults, setDefaults] = useState<ListingFormDefaults>(EMPTY_LISTING_FORM_DEFAULTS);

  function applyDraft(draft: {
    title?: string;
    description?: string;
    condition?: string;
    price?: string;
    categoryId?: string;
    photoUrls?: string;
  }) {
    setDefaults((prev) => ({
      ...prev,
      title: draft.title ?? prev.title,
      description: draft.description ?? prev.description,
      condition: draft.condition ?? prev.condition,
      price: draft.price ?? prev.price,
      categoryId: draft.categoryId ?? prev.categoryId,
      photoUrls: draft.photoUrls ?? prev.photoUrls,
    }));
    setFormKey((k) => k + 1);
  }

  function handleEbayImport() {
    setEbayError(null);
    startEbayTransition(async () => {
      const result = await importFromEbayAction(ebayUrl);
      if (result.error) {
        setEbayError(result.error);
        return;
      }
      if (result.data) applyDraft(result.data);
    });
  }

  function handleScreenshotImport() {
    setScreenshotError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setScreenshotError("Choose an image first.");
      return;
    }
    const formData = new FormData();
    formData.set("screenshot", file);
    startScreenshotTransition(async () => {
      const result = await importFromScreenshotAction(formData);
      if (result.error) {
        setScreenshotError(result.error);
        return;
      }
      if (result.data) applyDraft(result.data);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="text-sm font-medium">Import from eBay</h2>
          <p className="text-xs text-muted-foreground">
            Paste a link to your existing eBay listing to pre-fill the form below.
          </p>
          <div className="flex gap-2">
            <Input
              value={ebayUrl}
              onChange={(e) => setEbayUrl(e.target.value)}
              placeholder="https://www.ebay.com/itm/..."
              className="text-sm"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isEbayPending || !ebayUrl}
              onClick={handleEbayImport}
            >
              {isEbayPending ? "Importing…" : "Import"}
            </Button>
          </div>
          {ebayError ? <p className="text-xs text-destructive">{ebayError}</p> : null}
        </div>

        <div className="flex flex-col gap-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="text-sm font-medium">Read from a screenshot</h2>
          <p className="text-xs text-muted-foreground">
            Upload your own photo, or a screenshot of a listing you already have elsewhere — AI
            reads it to pre-fill the form. Nothing is scraped from other sites.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="screenshot" className="sr-only">
              Screenshot
            </Label>
            <input
              ref={fileInputRef}
              id="screenshot"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="text-sm"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isScreenshotPending}
              onClick={handleScreenshotImport}
              className="w-fit"
            >
              {isScreenshotPending ? "Reading…" : "Read image"}
            </Button>
          </div>
          {screenshotError ? <p className="text-xs text-destructive">{screenshotError}</p> : null}
        </div>
      </div>

      <ListingForm
        key={formKey}
        action={action}
        categories={categories}
        defaults={defaults}
        submitLabel="Post listing"
      />
    </div>
  );
}
