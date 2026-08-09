"use client";

import { useActionState } from "react";

import { updateShippingAddressAction, type ShippingAddressState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ShippingAddressDefaults {
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string;
}

export function ShippingAddressForm({ defaults }: { defaults: ShippingAddressDefaults }) {
  const [state, action, pending] = useActionState<ShippingAddressState, FormData>(
    updateShippingAddressAction,
    undefined
  );

  const errors = state?.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="addressLine1">Address</Label>
        <Input id="addressLine1" name="addressLine1" defaultValue={defaults.addressLine1} required />
        {errors.addressLine1 ? (
          <p className="text-sm text-destructive">{errors.addressLine1[0]}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="addressLine2">Apt, suite, etc. (optional)</Label>
        <Input id="addressLine2" name="addressLine2" defaultValue={defaults.addressLine2} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={defaults.city} required />
          {errors.city ? <p className="text-sm text-destructive">{errors.city[0]}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="region">State</Label>
          <Input id="region" name="region" defaultValue={defaults.region} required />
          {errors.region ? <p className="text-sm text-destructive">{errors.region[0]}</p> : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="postalCode">Postal code</Label>
          <Input id="postalCode" name="postalCode" defaultValue={defaults.postalCode} required />
          {errors.postalCode ? (
            <p className="text-sm text-destructive">{errors.postalCode[0]}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="country">Country</Label>
          <Input id="country" name="country" defaultValue={defaults.country} required />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Phone number</Label>
        <Input id="phone" name="phone" type="tel" defaultValue={defaults.phone} required />
        <p className="text-xs text-muted-foreground">
          Used by the courier if they need to reach you about a pickup.
        </p>
        {errors.phone ? <p className="text-sm text-destructive">{errors.phone[0]}</p> : null}
      </div>

      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Save shipping address"}
      </Button>
    </form>
  );
}
