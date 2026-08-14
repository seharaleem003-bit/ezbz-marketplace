import { TrendingDown } from "lucide-react";

import { cn } from "@/lib/utils";

export interface DiscountInfo {
  percent: number;
  /** Which price the discount was measured against. */
  basis: "amazon" | "retail";
}

/**
 * Percentage saved versus a reference price. Amazon wins when we have it —
 * it's the live competing price a buyer would actually pay today — with the
 * listing's stated retail price as the fallback.
 */
export function calculateDiscount({
  priceCents,
  amazonPriceCents,
  retailPriceCents,
}: {
  priceCents: number;
  amazonPriceCents?: number | null;
  retailPriceCents?: number | null;
}): DiscountInfo | null {
  const reference =
    amazonPriceCents && amazonPriceCents > priceCents
      ? { value: amazonPriceCents, basis: "amazon" as const }
      : retailPriceCents && retailPriceCents > priceCents
        ? { value: retailPriceCents, basis: "retail" as const }
        : null;

  if (!reference) return null;

  const percent = Math.round(((reference.value - priceCents) / reference.value) * 100);

  // Sub-1% rounds to 0 and reads as broken rather than as a small saving.
  if (percent < 1) return null;

  return { percent, basis: reference.basis };
}

export function DiscountBadge({
  discount,
  labels,
  size = "md",
  className,
}: {
  discount: DiscountInfo;
  labels: { off: string; vsAmazon: string; offRetail: string };
  size?: "sm" | "md";
  className?: string;
}) {
  const sizeClasses = {
    sm: "gap-1 px-2 py-0.5 text-[11px]",
    md: "gap-1.5 px-2.5 py-1 text-sm",
  }[size];

  const basisLabel = discount.basis === "amazon" ? labels.vsAmazon : labels.offRetail;

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full bg-emerald-600 font-semibold text-white shadow-sm",
        sizeClasses,
        className
      )}
      title={`${discount.percent}% ${labels.off} — ${basisLabel}`}
    >
      <TrendingDown className={size === "sm" ? "size-3" : "size-3.5"} />
      <span className="font-bold">
        {discount.percent}% {labels.off}
      </span>
      <span className="font-normal opacity-90">{basisLabel}</span>
    </div>
  );
}
