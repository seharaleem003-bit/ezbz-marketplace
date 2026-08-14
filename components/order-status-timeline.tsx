import { Check, CircleX, Package, PackageCheck, Truck, Warehouse } from "lucide-react";

import { cn } from "@/lib/utils";

export type OrderStatus = "PLACED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

const STEPS = ["PLACED", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

const STEP_ICONS = {
  PLACED: Package,
  PROCESSING: Warehouse,
  SHIPPED: Truck,
  DELIVERED: PackageCheck,
};

export interface OrderTimelineLabels {
  placed: string;
  processing: string;
  shipped: string;
  delivered: string;
  cancelled: string;
  cancelledNote: string;
}

export function OrderStatusTimeline({
  status,
  labels,
}: {
  status: OrderStatus;
  labels: OrderTimelineLabels;
}) {
  const stepLabels: Record<(typeof STEPS)[number], string> = {
    PLACED: labels.placed,
    PROCESSING: labels.processing,
    SHIPPED: labels.shipped,
    DELIVERED: labels.delivered,
  };

  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <CircleX className="size-5 shrink-0 text-destructive" />
        <div>
          <p className="font-medium text-destructive">{labels.cancelled}</p>
          <p className="text-sm text-muted-foreground">{labels.cancelledNote}</p>
        </div>
      </div>
    );
  }

  const currentIndex = STEPS.indexOf(status as (typeof STEPS)[number]);

  return (
    <div className="rounded-xl border p-4">
      <ol className="flex items-start">
        {STEPS.map((step, index) => {
          const Icon = STEP_ICONS[step];
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isLast = index === STEPS.length - 1;

          return (
            <li key={step} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {/* Spacer keeps the first icon centred over its own label. */}
                <div
                  className={cn(
                    "h-0.5 flex-1",
                    index === 0 ? "bg-transparent" : isComplete || isCurrent ? "bg-gold-500" : "bg-border"
                  )}
                />
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    isComplete && "border-gold-500 bg-gold-500 text-navy-900",
                    isCurrent && "border-gold-500 bg-background text-gold-600",
                    !isComplete && !isCurrent && "border-border bg-background text-muted-foreground"
                  )}
                >
                  {isComplete ? <Check className="size-4" /> : <Icon className="size-4" />}
                </div>
                <div
                  className={cn(
                    "h-0.5 flex-1",
                    isLast ? "bg-transparent" : isComplete ? "bg-gold-500" : "bg-border"
                  )}
                />
              </div>

              <p
                className={cn(
                  "mt-2 px-1 text-center text-xs",
                  isCurrent
                    ? "font-semibold text-foreground"
                    : isComplete
                      ? "text-foreground"
                      : "text-muted-foreground"
                )}
              >
                {stepLabels[step]}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
