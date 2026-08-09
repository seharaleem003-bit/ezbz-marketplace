"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";

export type ShippingActionState = { error?: string; success?: string } | undefined;
type BoundShippingAction = (prevState: ShippingActionState, formData: FormData) => Promise<ShippingActionState>;

export function OrderShippingPanel({
  easyshipShipmentId,
  trackingNumber,
  carrier,
  trackingUrl,
  createShipmentAction,
  buyLabelAction,
  refreshTrackingAction,
  disabledReason,
}: {
  easyshipShipmentId: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  trackingUrl: string | null;
  createShipmentAction: BoundShippingAction;
  buyLabelAction: BoundShippingAction;
  refreshTrackingAction: BoundShippingAction;
  disabledReason?: ReactNode;
}) {
  const [createState, createAction, creating] = useActionState<ShippingActionState, FormData>(
    createShipmentAction,
    undefined
  );
  const [labelState, labelAction, buying] = useActionState<ShippingActionState, FormData>(
    buyLabelAction,
    undefined
  );
  const [refreshState, refreshAction, refreshing] = useActionState<ShippingActionState, FormData>(
    refreshTrackingAction,
    undefined
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span className="text-muted-foreground">Easyship shipment</span>
        <span>{easyshipShipmentId ?? "Not created"}</span>
        <span className="text-muted-foreground">Carrier</span>
        <span>{carrier ?? "—"}</span>
        <span className="text-muted-foreground">Tracking number</span>
        <span>{trackingNumber ?? "—"}</span>
        {trackingUrl ? (
          <>
            <span className="text-muted-foreground">Tracking link</span>
            <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
              View tracking
            </a>
          </>
        ) : null}
      </div>

      {disabledReason ? (
        <p className="text-sm text-destructive">{disabledReason}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {!easyshipShipmentId ? (
            <form action={createAction}>
              <Button type="submit" size="sm" disabled={creating}>
                {creating ? "Creating…" : "Create shipment"}
              </Button>
            </form>
          ) : (
            <>
              <form action={labelAction}>
                <Button type="submit" size="sm" variant="outline" disabled={buying}>
                  {buying ? "Buying label…" : "Buy label"}
                </Button>
              </form>
              <form action={refreshAction}>
                <Button type="submit" size="sm" variant="ghost" disabled={refreshing}>
                  {refreshing ? "Refreshing…" : "Refresh tracking"}
                </Button>
              </form>
            </>
          )}
        </div>
      )}

      {createState?.error ? <p className="text-sm text-destructive">{createState.error}</p> : null}
      {createState?.success ? <p className="text-sm text-emerald-600">{createState.success}</p> : null}
      {labelState?.error ? <p className="text-sm text-destructive">{labelState.error}</p> : null}
      {labelState?.success ? <p className="text-sm text-emerald-600">{labelState.success}</p> : null}
      {refreshState?.error ? <p className="text-sm text-destructive">{refreshState.error}</p> : null}
      {refreshState?.success ? <p className="text-sm text-emerald-600">{refreshState.success}</p> : null}
    </div>
  );
}
