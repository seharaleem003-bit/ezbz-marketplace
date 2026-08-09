"use client";

import { useActionState, useState } from "react";

import { placeOrderAction, type CheckoutActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/format";

type SavedAddress = {
  id: string;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

export function CheckoutForm({
  storeCreditCents,
  allowPickup,
  addresses,
  subtotalCents,
}: {
  storeCreditCents: number;
  allowPickup: boolean;
  addresses: SavedAddress[];
  subtotalCents: number;
}) {
  const [state, action, pending] = useActionState<CheckoutActionState, FormData>(
    placeOrderAction,
    undefined
  );
  const [shippingMethod, setShippingMethod] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  // Display-only estimate — the server recomputes this against the true
  // post-credit subtotal in placeOrderAction.
  const estimatedRoundUpCents = (100 - (subtotalCents % 100)) % 100;

  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [addressChoice, setAddressChoice] = useState<string>(defaultAddress?.id ?? "new");
  const [saveAddress, setSaveAddress] = useState(true);

  const usingNewAddress = addressChoice === "new";

  return (
    <form action={action} className="flex flex-col gap-4">
      {allowPickup ? (
        <div className="flex flex-col gap-1.5">
          <Label>Fulfillment</Label>
          <input type="hidden" name="shippingMethod" value={shippingMethod} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShippingMethod("DELIVERY")}
              className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm ${shippingMethod === "DELIVERY" ? "border-primary bg-primary/5" : "border-input"}`}
            >
              <span className="font-medium">Delivery</span>
              <p className="text-xs text-muted-foreground">Shipped to your address</p>
            </button>
            <button
              type="button"
              onClick={() => setShippingMethod("PICKUP")}
              className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm ${shippingMethod === "PICKUP" ? "border-primary bg-primary/5" : "border-input"}`}
            >
              <span className="font-medium">Local pickup</span>
              <p className="text-xs text-muted-foreground">Arrange pickup with the seller</p>
            </button>
          </div>
        </div>
      ) : null}

      {addresses.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Label>{shippingMethod === "PICKUP" ? "Address (for your records)" : "Shipping address"}</Label>
          <input type="hidden" name="addressChoice" value={addressChoice} />
          <div className="flex flex-col gap-2">
            {addresses.map((address) => (
              <label
                key={address.id}
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm ${addressChoice === address.id ? "border-primary bg-primary/5" : "border-input"}`}
              >
                <input
                  type="radio"
                  className="mt-1"
                  checked={addressChoice === address.id}
                  onChange={() => setAddressChoice(address.id)}
                />
                <span>
                  <span className="flex items-center gap-1.5 font-medium">
                    {address.fullName}
                    {address.isDefault ? <Badge>Default</Badge> : null}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state}{" "}
                    {address.postalCode}
                  </span>
                </span>
              </label>
            ))}
            <label
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm ${usingNewAddress ? "border-primary bg-primary/5" : "border-input"}`}
            >
              <input
                type="radio"
                checked={usingNewAddress}
                onChange={() => setAddressChoice("new")}
              />
              <span className="font-medium">Use a new address</span>
            </label>
          </div>
        </div>
      ) : null}

      {usingNewAddress ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shippingName">Full name</Label>
            <Input id="shippingName" name="shippingName" autoComplete="name" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shippingLine1">
              {shippingMethod === "PICKUP" ? "Address (for your records)" : "Address"}
            </Label>
            <Input
              id="shippingLine1"
              name="shippingLine1"
              autoComplete="address-line1"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shippingLine2">Apt, suite, etc. (optional)</Label>
            <Input id="shippingLine2" name="shippingLine2" autoComplete="address-line2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shippingCity">City</Label>
              <Input id="shippingCity" name="shippingCity" autoComplete="address-level2" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shippingState">State</Label>
              <Input
                id="shippingState"
                name="shippingState"
                autoComplete="address-level1"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shippingPostal">Postal code</Label>
              <Input
                id="shippingPostal"
                name="shippingPostal"
                autoComplete="postal-code"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shippingCountry">Country</Label>
              <Input
                id="shippingCountry"
                name="shippingCountry"
                autoComplete="country-name"
                defaultValue="United States"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="saveAddress"
                name="saveAddress"
                checked={saveAddress}
                onCheckedChange={(checked) => setSaveAddress(checked === true)}
              />
              <Label htmlFor="saveAddress" className="font-normal">
                Save this address to my account
              </Label>
            </div>
            {saveAddress && addresses.length > 0 ? (
              <div className="flex items-center gap-2 pl-6">
                <Checkbox id="setDefaultAddress" name="setDefaultAddress" />
                <Label htmlFor="setDefaultAddress" className="font-normal">
                  Set as my default address
                </Label>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {storeCreditCents > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <Checkbox id="applyStoreCredit" name="applyStoreCredit" defaultChecked />
          <Label htmlFor="applyStoreCredit" className="font-normal">
            Apply my store credit ({formatCents(storeCreditCents)} available)
          </Label>
        </div>
      ) : null}

      {estimatedRoundUpCents > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <Checkbox id="roundUpForGood" name="roundUpForGood" />
          <Label htmlFor="roundUpForGood" className="font-normal">
            Round up {formatCents(estimatedRoundUpCents)} for Help Board
          </Label>
        </div>
      ) : null}

      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Redirecting to payment…" : "Continue to payment"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        You&apos;ll enter payment details on Stripe&apos;s secure checkout page.
      </p>
    </form>
  );
}
