import { ExternalLink } from "lucide-react";

import { formatCents } from "@/lib/format";

/**
 * Falls back to an Amazon keyword search when a listing has no explicit
 * Amazon URL — every listing should offer a price comparison, even the ones
 * nobody has manually researched yet.
 */
function amazonSearchUrl(title: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(title)}`;
}

export function AmazonPriceCompare({
  title,
  ezbzPriceCents,
  amazonPriceCents,
  amazonUrl,
  amazonPriceCheckedAt,
}: {
  title: string;
  ezbzPriceCents: number;
  amazonPriceCents: number | null;
  amazonUrl: string | null;
  amazonPriceCheckedAt: Date | null;
}) {
  const href = amazonUrl ?? amazonSearchUrl(title);
  const hasPrice = Boolean(amazonPriceCents);

  const savingsCents = hasPrice ? (amazonPriceCents as number) - ezbzPriceCents : 0;
  const savingsPercent =
    hasPrice && (amazonPriceCents as number) > 0
      ? Math.round((savingsCents / (amazonPriceCents as number)) * 100)
      : 0;

  return (
    <div className="rounded-lg border bg-secondary/40 p-3 text-sm">
      {hasPrice ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Amazon price</span>
            <span className="font-medium">{formatCents(amazonPriceCents as number)}</span>
          </div>
          {savingsCents > 0 ? (
            <p className="mt-1 font-medium text-emerald-700 dark:text-emerald-400">
              Save {formatCents(savingsCents)} ({savingsPercent}%) buying through EZBZ
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-muted-foreground">
          Check the price elsewhere before you buy — we&apos;ll take you straight to Amazon
          results for this item.
        </p>
      )}

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow sponsored"
        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-foreground underline underline-offset-4"
      >
        Compare on Amazon
        <ExternalLink className="size-3.5" />
      </a>

      {hasPrice && amazonPriceCheckedAt ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Price checked {amazonPriceCheckedAt.toLocaleDateString()}
        </p>
      ) : null}
    </div>
  );
}
