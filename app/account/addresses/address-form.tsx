"use client";

import { useActionState } from "react";

import type { AddressActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export interface AddressFormDefaults {
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

type BoundAddressAction = (
  prevState: AddressActionState,
  formData: FormData
) => Promise<AddressActionState>;

export function AddressForm({
  action: boundAction,
  defaults,
  hideDefaultToggle,
  submitLabel,
}: {
  action: BoundAddressAction;
  defaults: AddressFormDefaults;
  hideDefaultToggle?: boolean;
  submitLabel: string;
}) {
  const [state, action, pending] = useActionState<AddressActionState, FormData>(
    boundAction,
    undefined
  );

  const errors = state?.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" autoComplete="name" defaultValue={defaults.fullName} required />
        {errors.fullName ? <p className="text-sm text-destructive">{errors.fullName[0]}</p> : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="line1">Address</Label>
        <Input id="line1" name="line1" autoComplete="address-line1" defaultValue={defaults.line1} required />
        {errors.line1 ? <p className="text-sm text-destructive">{errors.line1[0]}</p> : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="line2">Apt, suite, etc. (optional)</Label>
        <Input id="line2" name="line2" autoComplete="address-line2" defaultValue={defaults.line2} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" autoComplete="address-level2" defaultValue={defaults.city} required />
          {errors.city ? <p className="text-sm text-destructive">{errors.city[0]}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" autoComplete="address-level1" defaultValue={defaults.state} required />
          {errors.state ? <p className="text-sm text-destructive">{errors.state[0]}</p> : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="postalCode">Postal code</Label>
          <Input
            id="postalCode"
            name="postalCode"
            autoComplete="postal-code"
            defaultValue={defaults.postalCode}
            required
          />
          {errors.postalCode ? (
            <p className="text-sm text-destructive">{errors.postalCode[0]}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            name="country"
            autoComplete="country-name"
            defaultValue={defaults.country}
            required
          />
        </div>
      </div>

      {!hideDefaultToggle ? (
        <div className="flex items-center gap-2">
          <Checkbox id="isDefault" name="isDefault" defaultChecked={defaults.isDefault} />
          <Label htmlFor="isDefault" className="font-normal">
            Set as default address
          </Label>
        </div>
      ) : null}

      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
