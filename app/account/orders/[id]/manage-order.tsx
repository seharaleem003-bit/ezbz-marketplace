"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Ban, Minus, PencilLine, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import {
  cancelOrderAction,
  updateOrderAddressAction,
  reduceOrderItemAction,
  type OrderEditState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ManageOrderLabels {
  manageOrder: string;
  editableNote: string;
  lockedNote: string;
  editAddress: string;
  saveAddress: string;
  saving: string;
  cancelEdit: string;
  cancelOrder: string;
  cancelling: string;
  confirmCancel: string;
  removeItem: string;
  addMoreTitle: string;
  addMoreBlurb: string;
  keepShopping: string;
  fullName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ManageOrderItem {
  id: string;
  title: string;
  quantity: number;
}

export interface ManageOrderAddress {
  shippingName: string;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPostal: string;
  shippingCountry: string;
}

export function ManageOrder({
  orderId,
  editable,
  isPickup,
  items,
  address,
  labels,
}: {
  orderId: string;
  editable: boolean;
  isPickup: boolean;
  items: ManageOrderItem[];
  address: ManageOrderAddress;
  labels: ManageOrderLabels;
}) {
  const [editingAddress, setEditingAddress] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [cancelState, cancelAction, cancelPending] = useActionState<OrderEditState, FormData>(
    cancelOrderAction.bind(null, orderId),
    undefined
  );
  const [addressState, addressAction, addressPending] = useActionState<OrderEditState, FormData>(
    updateOrderAddressAction.bind(null, orderId),
    undefined
  );

  if (!editable) {
    return (
      <div className="mt-6 rounded-xl border bg-muted/40 p-4">
        <p className="text-sm text-muted-foreground">{labels.lockedNote}</p>
      </div>
    );
  }

  const activeError = cancelState?.error ?? addressState?.error;
  const activeSuccess = cancelState?.success ?? addressState?.success;

  function reduce(itemId: string, nextQuantity: number) {
    startTransition(async () => {
      const result = await reduceOrderItemAction(orderId, itemId, nextQuantity);
      if (result?.error) toast.error(result.error);
      if (result?.success) toast.success(result.success);
    });
  }

  return (
    <div className="mt-6 rounded-xl border p-4">
      <h2 className="text-sm font-medium">{labels.manageOrder}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{labels.editableNote}</p>

      {activeError ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {activeError}
        </p>
      ) : null}
      {activeSuccess ? (
        <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400" role="status">
          {activeSuccess}
        </p>
      ) : null}

      {/* Per-line quantity control. Only reductions are offered — see the
          note below about adding items to a paid order. */}
      <ul className="mt-4 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {item.title} &times; {item.quantity}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => reduce(item.id, item.quantity - 1)}
            >
              <Minus />
              {item.quantity === 1 ? labels.removeItem : "1"}
            </Button>
          </li>
        ))}
      </ul>

      {!isPickup ? (
        <div className="mt-5 border-t pt-4">
          {editingAddress ? (
            <form action={addressAction} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shippingName">{labels.fullName}</Label>
                <Input id="shippingName" name="shippingName" defaultValue={address.shippingName} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shippingLine1">{labels.addressLine1}</Label>
                <Input id="shippingLine1" name="shippingLine1" defaultValue={address.shippingLine1} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shippingLine2">{labels.addressLine2}</Label>
                <Input
                  id="shippingLine2"
                  name="shippingLine2"
                  defaultValue={address.shippingLine2 ?? ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="shippingCity">{labels.city}</Label>
                  <Input id="shippingCity" name="shippingCity" defaultValue={address.shippingCity} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="shippingState">{labels.state}</Label>
                  <Input id="shippingState" name="shippingState" defaultValue={address.shippingState} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="shippingPostal">{labels.postalCode}</Label>
                  <Input id="shippingPostal" name="shippingPostal" defaultValue={address.shippingPostal} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="shippingCountry">{labels.country}</Label>
                  <Input id="shippingCountry" name="shippingCountry" defaultValue={address.shippingCountry} required />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={addressPending}>
                  {addressPending ? labels.saving : labels.saveAddress}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingAddress(false)}
                >
                  {labels.cancelEdit}
                </Button>
              </div>
            </form>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingAddress(true)}
            >
              <PencilLine />
              {labels.editAddress}
            </Button>
          )}
        </div>
      ) : null}

      <div className="mt-5 rounded-lg bg-muted/50 p-3">
        <p className="text-sm font-medium">{labels.addMoreTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{labels.addMoreBlurb}</p>
        <Button variant="outline" size="sm" className="mt-2" render={<Link href="/listings" />}>
          <ShoppingBag />
          {labels.keepShopping}
        </Button>
      </div>

      <form
        action={cancelAction}
        className="mt-5 border-t pt-4"
        onSubmit={(event) => {
          if (!window.confirm(labels.confirmCancel)) event.preventDefault();
        }}
      >
        <Button type="submit" variant="destructive" size="sm" disabled={cancelPending}>
          <Ban />
          {cancelPending ? labels.cancelling : labels.cancelOrder}
        </Button>
      </form>
    </div>
  );
}
