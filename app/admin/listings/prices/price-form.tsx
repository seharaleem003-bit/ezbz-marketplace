"use client";

import { useActionState } from "react";
import Image from "next/image";
import { ExternalLink, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCents } from "@/lib/format";
import { saveAmazonPricesAction, type PriceUpdateState } from "./actions";

export interface PriceRow {
  id: string;
  title: string;
  photoUrl: string | null;
  priceCents: number;
  amazonPriceCents: number | null;
  amazonUrl: string | null;
  checkedAt: string | null;
}

/**
 * One row per listing: photo, our price, the Amazon link (opens in a new tab),
 * and a box for the Amazon price. Designed for the loop "open link, read
 * price, type it, next" — the link and the box sit side by side so the eye
 * doesn't travel.
 */
export function PriceForm({ rows }: { rows: PriceRow[] }) {
  const [state, action, pending] = useActionState<PriceUpdateState, FormData>(
    saveAmazonPricesAction,
    undefined
  );

  return (
    <form action={action} className="space-y-4">
      <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="p-3 font-medium">Product</th>
              <th className="p-3 font-medium">Our price</th>
              <th className="p-3 font-medium">Amazon</th>
              <th className="p-3 font-medium">Amazon price ($)</th>
              <th className="p-3 font-medium">Discount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pct =
                r.amazonPriceCents && r.amazonPriceCents > r.priceCents
                  ? Math.round((1 - r.priceCents / r.amazonPriceCents) * 100)
                  : null;
              return (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {r.photoUrl ? (
                        <Image
                          src={r.photoUrl}
                          alt=""
                          width={40}
                          height={40}
                          className="size-10 shrink-0 rounded-md bg-muted object-contain"
                        />
                      ) : (
                        <span className="size-10 shrink-0 rounded-md bg-muted" />
                      )}
                      <span className="line-clamp-2 max-w-xs">{r.title}</span>
                    </div>
                  </td>
                  <td className="p-3 font-medium">{formatCents(r.priceCents)}</td>
                  <td className="p-3">
                    {r.amazonUrl ? (
                      <a
                        href={r.amazonUrl}
                        target="_blank"
                        rel="noreferrer nofollow"
                        className="inline-flex items-center gap-1 text-navy-800 hover:underline"
                      >
                        Open <ExternalLink className="size-3.5" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">no link</span>
                    )}
                  </td>
                  <td className="p-3">
                    <Input
                      name={`price:${r.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={r.amazonPriceCents ? (r.amazonPriceCents / 100).toFixed(2) : "0.00"}
                      defaultValue={r.amazonPriceCents ? (r.amazonPriceCents / 100).toFixed(2) : ""}
                      className="w-28"
                    />
                    {r.checkedAt ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">checked {r.checkedAt}</p>
                    ) : null}
                  </td>
                  <td className="p-3">
                    {pct !== null ? (
                      <span className="rounded-full bg-gold-500 px-2 py-0.5 text-xs font-bold text-navy-900">
                        {pct}% off
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          <Save />
          {pending ? "Saving…" : "Save prices"}
        </Button>
        {state?.saved !== undefined ? (
          <span className="text-sm text-green-700">
            Saved {state.saved} price{state.saved === 1 ? "" : "s"} — badges and Deal Scores updated.
          </span>
        ) : null}
        {state?.error ? <span className="text-sm text-destructive">{state.error}</span> : null}
      </div>
    </form>
  );
}
