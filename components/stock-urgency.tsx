import { Flame, PackageX } from "lucide-react";

/**
 * Scarcity notice for a product page.
 *
 * The number is the real inventory count, so this only ever says what is
 * true — a listing with 40 in stock shows nothing at all. Urgency is tiered
 * rather than flat: one unit left is genuinely different from three, and
 * shouting equally about both trains shoppers to ignore it.
 */
export function StockUrgency({
  quantity,
  labels,
}: {
  quantity: number;
  labels: {
    outOfStock: string;
    /** "Only {count} left" — {count} is substituted. */
    onlyLeft: string;
    orderSoon: string;
  };
}) {
  if (quantity <= 0) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm font-medium text-muted-foreground">
        <PackageX className="size-4 shrink-0" />
        {labels.outOfStock}
      </p>
    );
  }

  if (quantity > 5) return null;

  const critical = quantity <= 2;
  const text = labels.onlyLeft.replace("{count}", String(quantity));

  return (
    <div
      className={[
        "flex items-center gap-2.5 rounded-lg px-3 py-2.5 ring-1",
        critical
          ? "bg-destructive/10 text-destructive ring-destructive/25"
          : "bg-gold-500/10 text-gold-700 ring-gold-500/30 dark:text-gold-400",
      ].join(" ")}
    >
      {/* Pulsing dot reads as "live stock", which is what it is — the number
          drops the moment someone checks out. */}
      <span className="relative flex size-2.5 shrink-0">
        <span
          className={[
            "absolute inline-flex size-full animate-ping rounded-full opacity-70",
            critical ? "bg-destructive" : "bg-gold-500",
          ].join(" ")}
        />
        <span
          className={[
            "relative inline-flex size-2.5 rounded-full",
            critical ? "bg-destructive" : "bg-gold-500",
          ].join(" ")}
        />
      </span>

      <Flame className="size-4 shrink-0" />

      <p className="text-sm font-semibold">
        {text}
        {critical ? (
          <span className="font-normal opacity-80">
            {" · "}
            {labels.orderSoon}
          </span>
        ) : null}
      </p>
    </div>
  );
}
