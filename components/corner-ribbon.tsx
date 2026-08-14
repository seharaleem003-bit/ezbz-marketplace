import { cn } from "@/lib/utils";

export type RibbonKind = "sold" | "prebook";

/**
 * Diagonal corner ribbon across the top-left of a product image.
 *
 * Rendered inside the image's relatively-positioned wrapper. The strip is
 * rotated 45° and oversized so its ends run past the corner rather than
 * stopping short of it.
 */
export function CornerRibbon({
  kind,
  label,
  className,
}: {
  kind: RibbonKind;
  label: string;
  className?: string;
}) {
  const tone =
    kind === "sold"
      ? "bg-destructive text-white"
      : "bg-gold-500 text-navy-900";

  return (
    <div
      className={cn(
        "pointer-events-none absolute left-0 top-0 z-10 size-24 overflow-hidden",
        className
      )}
      aria-hidden
    >
      <span
        className={cn(
          "absolute -left-8 top-4 w-32 -rotate-45 py-1 text-center text-[11px] font-bold uppercase tracking-wider shadow-md",
          tone
        )}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * Which ribbon a listing should carry, if any.
 *
 * Pre-book wins over sold-out: those listings are deliberately sold ahead of
 * stock arriving, so flagging them "sold" would tell buyers not to order the
 * very thing we're asking them to reserve.
 */
export function ribbonFor(listing: {
  isPrebook?: boolean | null;
  inventoryQty?: number | null;
}): RibbonKind | null {
  if (listing.isPrebook) return "prebook";
  if ((listing.inventoryQty ?? 0) <= 0) return "sold";
  return null;
}
