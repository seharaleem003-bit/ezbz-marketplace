import { Truck } from "lucide-react";

import { formatCents } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/shipping";

export function FreeShippingMeter({
  subtotalCents,
  remainingForFreeCents,
  labels,
}: {
  subtotalCents: number;
  remainingForFreeCents: number;
  labels: {
    unlocked: string;
    deliveryOnUs: string;
    addMorePrefix: string;
    addMoreSuffix: string;
    freeShipping: string;
    progressLabel: string;
  };
}) {
  const unlocked = remainingForFreeCents === 0;
  const progress = Math.min(100, Math.round((subtotalCents / FREE_SHIPPING_THRESHOLD_CENTS) * 100));

  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <div className="flex items-start gap-2">
        <Truck className={unlocked ? "size-4 text-gold-600" : "size-4 text-muted-foreground"} />
        <p className="text-sm">
          {unlocked ? (
            <>
              <span className="font-semibold text-gold-600">{labels.unlocked}</span>{" "}
              <span className="text-muted-foreground">{labels.deliveryOnUs}</span>
            </>
          ) : (
            <>
              {labels.addMorePrefix}{" "}
              <span className="font-semibold text-foreground">
                {formatCents(remainingForFreeCents)}
              </span>{" "}
              {labels.addMoreSuffix}{" "}
              <span className="font-semibold text-foreground">{labels.freeShipping}</span>
            </>
          )}
        </p>
      </div>

      <div
        className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={labels.progressLabel}
      >
        <div
          className="h-full rounded-full bg-gold-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
