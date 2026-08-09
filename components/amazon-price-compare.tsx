import { ExternalLink } from "lucide-react";

import { formatCents } from "@/lib/format";

export function AmazonPriceCompare({
  ezbzPriceCents,
  amazonPriceCents,
  amazonUrl,
  amazonPriceCheckedAt,
}: {
  ezbzPriceCents: number;
  amazonPriceCents: number | null;
  amazonUrl: string | null;
  amazonPriceCheckedAt: Date | null;
}) {
  if (!amazonPriceCents || !amazonUrl) return null;

  const savingsCents = amazonPriceCents - ezbzPriceCents;
  const savingsPercent =
    amazonPriceCents > 0 ? Math.round((savingsCents / amazonPriceCents) * 100) : 0;

  return (
    <div className="rounded-lg border bg-secondary/40 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">Amazon price</span>
        <span className="font-medium">{formatCents(amazonPriceCents)}</span>
      </div>
      {savingsCents > 0 ? (
        <p className="mt-1 font-medium text-emerald-700 dark:text-emerald-400">
          Save {formatCents(savingsCents)} ({savingsPercent}%) buying through EZBZ
        </p>
      ) : null}
      <a
        href={amazonUrl}
        target="_blank"
        rel="noopener noreferrer nofollow sponsored"
        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-foreground underline underline-offset-4"
      >
        Compare on Amazon
        <ExternalLink className="size-3.5" />
      </a>
      {amazonPriceCheckedAt ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Price checked {amazonPriceCheckedAt.toLocaleDateString()}
        </p>
      ) : null}
    </div>
  );
}
