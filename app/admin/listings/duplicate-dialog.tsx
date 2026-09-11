"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertTriangle, Check, ExternalLink, Fingerprint, Link2, Type } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCents, formatCondition } from "@/lib/format";
import type { DuplicateCandidate, MatchReason } from "@/lib/duplicate-listings";
import { restockExistingListingAction, type RestockResult } from "./actions";

const REASON: Record<MatchReason, { label: string; hint: string; Icon: typeof Type }> = {
  asin: {
    label: "Same Amazon product",
    hint: "Identical ASIN — this is the same item, not a similar one.",
    Icon: Fingerprint,
  },
  slug: {
    label: "Same web address",
    hint: "It would compete with this listing for the same URL.",
    Icon: Link2,
  },
  title: { label: "Very similar name", hint: "Worth a look before adding another.", Icon: Type },
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

/**
 * Shown when saving a new listing finds products that look like the same
 * thing.
 *
 * The decision is deliberately not made for the operator. A second record for
 * a product you already stock splits its inventory, its URL and its search
 * ranking — but genuinely different variants (a different colour, a different
 * pack size) do deserve their own listing, and only a person can tell which
 * this is. So it shows the evidence and offers both routes.
 */
export function DuplicateDialog({
  duplicates,
  onCreateAnyway,
  onDismiss,
  mode = "modal",
}: {
  duplicates: DuplicateCandidate[];
  onCreateAnyway?: () => void;
  onDismiss: () => void;
  /**
   * "modal" blocks the save that triggered it. "inline" sits in the form as a
   * warning while the title is still being typed, where there is nothing to
   * confirm yet — so it offers restocking but not "create anyway".
   */
  mode?: "modal" | "inline";
}) {
  const [qty, setQty] = useState<Record<string, string>>({});
  const [result, setResult] = useState<RestockResult["restocked"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function restock(candidate: DuplicateCandidate) {
    const add = Number(qty[candidate.id] ?? "1");
    if (!Number.isInteger(add) || add < 1) {
      setError("Enter a whole number of units to add.");
      return;
    }
    setError(null);
    setPendingId(candidate.id);
    startTransition(async () => {
      const res = await restockExistingListingAction(candidate.id, add);
      setPendingId(null);
      if (res.error) setError(res.error);
      else if (res.restocked) setResult(res.restocked);
    });
  }

  return (
    <div
      className={
        mode === "modal"
          ? "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10"
          : ""
      }
    >
      <div
        className={
          mode === "modal"
            ? "w-full max-w-3xl rounded-xl bg-card shadow-xl ring-1 ring-foreground/10"
            : "w-full rounded-xl bg-card ring-1 ring-gold-500/50"
        }
      >
        {result ? (
          <div className="p-6">
            <h2 className="flex items-center gap-2 text-lg font-heading font-semibold text-emerald-700">
              <Check className="size-5" />
              Stock added
            </h2>
            <p className="mt-2 text-sm">
              <span className="font-medium">{result.title}</span> now has{" "}
              <span className="font-semibold">{result.newQty}</span> in stock.
              {result.republished ? " It was archived, so it has been published again." : ""}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Nothing was created, so the product keeps its one page and its search ranking.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button render={<Link href={`/admin/listings/${result.id}/edit`} />}>
                Edit that listing
              </Button>
              <Button variant="outline" render={<Link href={`/listings/${result.slug}`} target="_blank" />}>
                View it on the site
                <ExternalLink className="size-3.5" />
              </Button>
              <Button variant="ghost" onClick={onDismiss}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b p-6 pb-4">
              <h2 className="flex items-center gap-2 text-lg font-heading font-semibold">
                <AlertTriangle className="size-5 text-gold-600" />
                {duplicates.length === 1
                  ? "This product looks like one you already have"
                  : `${duplicates.length} products look like this one`}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "inline"
                  ? "You may already stock this. Add the units to the existing listing instead of creating a second one — a duplicate splits the stock across two pages and makes both harder to find."
                  : "Adding it again splits the stock across two pages and makes both harder to find. Add the units to the existing listing instead, unless this really is a different product."}
              </p>
            </div>

            <div className="max-h-[26rem] divide-y overflow-y-auto">
              {duplicates.map((d) => {
                const reason = REASON[d.reason];
                const sold = d.unitsSold > 0;
                const add = Number(qty[d.id] ?? "1");
                const nextQty = Number.isInteger(add) && add > 0 ? d.inventoryQty + add : null;
                return (
                  <div key={d.id} className="flex gap-4 p-4">
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-foreground/10">
                      {d.photoUrl ? (
                        <Image src={d.photoUrl} alt="" fill sizes="80px" className="object-contain p-1" />
                      ) : (
                        <span className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
                          no photo
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-gold-500/15 px-2 py-0.5 text-[11px] font-medium text-gold-700">
                          <reason.Icon className="size-3" />
                          {reason.label}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {STATUS_LABEL[d.status] ?? d.status}
                        </span>
                        {/* The operator asked to see what has not sold: those
                            are the safe ones to merge into. */}
                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-[11px] font-medium",
                            sold
                              ? "bg-navy-800/10 text-navy-800"
                              : "bg-emerald-500/15 text-emerald-700",
                          ].join(" ")}
                        >
                          {sold ? `${d.unitsSold} sold` : "Not sold yet"}
                        </span>
                      </div>

                      <Link
                        href={`/admin/listings/${d.id}/edit`}
                        target="_blank"
                        className="mt-1 block text-sm font-medium leading-snug hover:underline"
                      >
                        {d.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {d.categoryName} · {formatCondition(d.condition)} ·{" "}
                        {formatCents(d.priceCents)} · {d.inventoryQty} in stock
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground/80">{reason.hint}</p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <label className="text-xs text-muted-foreground" htmlFor={`add-${d.id}`}>
                          Add
                        </label>
                        <input
                          id={`add-${d.id}`}
                          type="number"
                          min={1}
                          step={1}
                          value={qty[d.id] ?? "1"}
                          onChange={(e) => setQty((p) => ({ ...p, [d.id]: e.target.value }))}
                          className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm tabular-nums"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isPending}
                          onClick={() => restock(d)}
                        >
                          {pendingId === d.id
                            ? "Adding…"
                            : nextQty === null
                              ? "Add to this listing"
                              : `Add to this listing (${d.inventoryQty} → ${nextQty})`}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {error ? (
              <p role="alert" className="border-t px-6 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            {/* Inline, nothing has been submitted yet, so there is no save to
                confirm — just a way to stop being warned and carry on. */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
              <Button variant="ghost" onClick={onDismiss} disabled={isPending}>
                {mode === "modal" ? "Cancel" : "Dismiss"}
              </Button>
              {mode === "modal" && onCreateAnyway ? (
                <Button variant="outline" onClick={onCreateAnyway} disabled={isPending}>
                  No, this is a different product — create it
                </Button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
