"use client";

import { useState, useTransition } from "react";
import { Sparkles, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { draftListingFromImageAction } from "./ai-actions";

/**
 * Upload a product photo, get a drafted listing.
 *
 * Fills the surrounding form's fields directly rather than owning them, so the
 * result is always editable and nothing is saved until the operator submits
 * the form themselves.
 */
export function AiDrafter() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lowConfidence, setLowConfidence] = useState(false);

  function setField(name: string, value: string | undefined) {
    if (!value) return;
    const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      `[name="${name}"]`
    );
    if (!el) return;
    el.value = value;
    // Let React-controlled inputs and Base UI selects notice the change.
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function onDraft(formEl: HTMLFormElement) {
    const fd = new FormData();
    const file = formEl.querySelector<HTMLInputElement>('input[type="file"]')?.files?.[0];
    const hint = formEl.querySelector<HTMLInputElement>('input[name="hint"]')?.value ?? "";
    if (!file) {
      setError("Choose a product image first.");
      return;
    }
    fd.set("image", file);
    fd.set("hint", hint);

    setError(null);
    setNotice(null);
    setLowConfidence(false);

    startTransition(async () => {
      const result = await draftListingFromImageAction(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      const d = result.data;
      if (!d) return;

      setField("title", d.title);
      setField("description", d.description);
      setField("metaTitle", d.metaTitle);
      setField("metaDescription", d.metaDescription);
      setField("searchKeywords", d.searchKeywords);
      setField("categoryId", d.categoryId);
      setField("condition", d.condition);

      // Slug is derived from the title elsewhere in the form; nudge it.
      setField("slug", d.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70));

      setLowConfidence(Boolean(d.lowConfidence));
      setNotice("Draft filled in below — review every field before saving.");
    });
  }

  return (
    <div className="mb-6 rounded-xl border border-dashed border-navy-800/30 bg-navy-900/[0.03] p-4">
      <div className="mb-1 flex items-center gap-2">
        <Sparkles className="size-4 text-gold-600" />
        <h2 className="font-heading text-sm font-semibold">Draft from a photo</h2>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Upload the product image and EZBZ writes an original title, description, and SEO copy
        from what&apos;s visible. It never copies another retailer&apos;s wording, and it
        can&apos;t see specifications the photo doesn&apos;t show — so check the details.
      </p>

      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        ref={(node) => {
          // Kept as a plain div, not a nested <form> — the listing form wraps
          // this, and nesting forms is invalid HTML.
          if (node) node.dataset.aiDrafter = "true";
        }}
      >
        <div className="flex-1">
          <Label htmlFor="ai-image" className="text-xs">
            Product image
          </Label>
          <Input id="ai-image" type="file" accept="image/jpeg,image/png,image/webp" />
        </div>
        <div className="flex-1">
          <Label htmlFor="ai-hint" className="text-xs">
            Notes (optional)
          </Label>
          <Input
            id="ai-hint"
            name="hint"
            placeholder="Brand, size, pack count…"
          />
        </div>
        <Button
          type="button"
          disabled={pending}
          onClick={(e) => {
            const container = (e.currentTarget.closest("[data-ai-drafter]") ??
              e.currentTarget.parentElement) as HTMLFormElement | null;
            if (container) onDraft(container);
          }}
        >
          {pending ? "Reading…" : "Draft listing"}
        </Button>
      </div>

      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="mt-2 text-sm text-green-700">{notice}</p> : null}
      {lowConfidence ? (
        <p className="mt-2 flex items-start gap-1.5 text-sm text-gold-700">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          The photo wasn&apos;t clear enough to identify this confidently — treat the draft as a
          starting point and correct it.
        </p>
      ) : null}
    </div>
  );
}
