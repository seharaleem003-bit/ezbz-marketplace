"use client";

import { useActionState, useRef, useState } from "react";

import type { ListingFormState } from "./actions";
import { EMPTY_LISTING_FORM_DEFAULTS, type ListingFormDefaults } from "./listing-form-defaults";
import { PhotoUploader } from "./photo-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const CONDITIONS = [
  { value: "NEW", label: "New" },
  { value: "LIKE_NEW", label: "Like New" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "SALVAGE", label: "Salvage" },
];

const STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

export function ListingForm({
  action,
  categories,
  fundraisers,
  defaults = EMPTY_LISTING_FORM_DEFAULTS,
  submitLabel = "Save listing",
  showSaveAndAddAnother = false,
  // Pre-book commits the platform to future stock, so it stays an admin-only
  // control — the seller-facing action doesn't read this field.
  showPrebook = false,
}: {
  action: (prevState: ListingFormState, formData: FormData) => Promise<ListingFormState>;
  categories: { id: string; name: string }[];
  fundraisers?: { id: string; name: string }[];
  defaults?: ListingFormDefaults;
  submitLabel?: string;
  showSaveAndAddAnother?: boolean;
  showPrebook?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ListingFormState, FormData>(
    action,
    undefined
  );

  const errors = state?.fieldErrors ?? {};

  // Auto-derive the slug from the title as the seller/admin types, unless
  // they've deliberately edited the slug themselves — removes a whole field
  // of manual typing for the common case without taking away control. Both
  // inputs stay uncontrolled (defaultValue) and the slug is updated
  // directly via ref, rather than switching it to a controlled `value` —
  // Base UI's Field.Control warns/misbehaves if an input flips from
  // uncontrolled to controlled after its first render.
  const slugInputRef = useRef<HTMLInputElement>(null);
  const [slugTouched, setSlugTouched] = useState(Boolean(defaults.slug));

  const defaultPhotoUrls = defaults.photoUrls
    ? defaults.photoUrls.split("\n").map((url) => url.trim()).filter(Boolean)
    : [];

  const defaultFulfillmentMode =
    defaults.fulfillmentPickup && defaults.fulfillmentDelivery
      ? "both"
      : defaults.fulfillmentPickup
        ? "pickup"
        : "delivery";

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            defaultValue={defaults.title}
            onChange={(e) => {
              if (!slugTouched && slugInputRef.current) {
                slugInputRef.current.value = slugify(e.target.value);
              }
            }}
            required
          />
          {errors.title ? <p className="text-sm text-destructive">{errors.title[0]}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input
            ref={slugInputRef}
            id="slug"
            name="slug"
            defaultValue={defaults.slug}
            onChange={() => setSlugTouched(true)}
            required
          />
          {errors.slug ? <p className="text-sm text-destructive">{errors.slug[0]}</p> : null}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={defaults.description}
          required
          className="rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {errors.description ? (
          <p className="text-sm text-destructive">{errors.description[0]}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="categoryId">Category</Label>
          <Select
            name="categoryId"
            defaultValue={defaults.categoryId}
            items={categories.map((category) => ({ value: category.id, label: category.name }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoryId ? (
            <p className="text-sm text-destructive">{errors.categoryId[0]}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="condition">Condition</Label>
          <Select name="condition" defaultValue={defaults.condition} items={CONDITIONS}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={defaults.status} items={STATUSES}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price">Price ($)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaults.price}
            required
          />
          {errors.price ? <p className="text-sm text-destructive">{errors.price[0]}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="retailPrice">Retail price ($, optional)</Label>
          <Input
            id="retailPrice"
            name="retailPrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaults.retailPrice}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="inventoryQty">Inventory qty</Label>
          <Input
            id="inventoryQty"
            name="inventoryQty"
            type="number"
            step="1"
            min="0"
            defaultValue={defaults.inventoryQty}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amazonPrice">Amazon price ($, optional)</Label>
          <Input
            id="amazonPrice"
            name="amazonPrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaults.amazonPrice}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amazonUrl">Amazon link (optional)</Label>
          <Input
            id="amazonUrl"
            name="amazonUrl"
            type="url"
            placeholder="https://www.amazon.com/..."
            defaultValue={defaults.amazonUrl}
          />
          {errors.amazonUrl ? (
            <p className="text-sm text-destructive">{errors.amazonUrl[0]}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Photos</Label>
        <PhotoUploader name="photoUrls" defaultUrls={defaultPhotoUrls} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="videoUrl">Video walkaround URL (optional)</Label>
          <Input
            id="videoUrl"
            name="videoUrl"
            type="url"
            placeholder="https://youtube.com/watch?v=... or direct .mp4 link"
            defaultValue={defaults.videoUrl}
          />
          {errors.videoUrl ? (
            <p className="text-sm text-destructive">{errors.videoUrl[0]}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="videoCaption">Video caption (optional)</Label>
          <Input id="videoCaption" name="videoCaption" defaultValue={defaults.videoCaption} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Fulfillment</Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
          <div className="flex items-center gap-2">
            <input
              id="fulfillmentModeDelivery"
              type="radio"
              name="fulfillmentMode"
              value="delivery"
              defaultChecked={defaultFulfillmentMode === "delivery"}
              className="size-4 accent-gold-500"
            />
            <Label htmlFor="fulfillmentModeDelivery" className="font-normal">
              Delivery only
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="fulfillmentModePickup"
              type="radio"
              name="fulfillmentMode"
              value="pickup"
              defaultChecked={defaultFulfillmentMode === "pickup"}
              className="size-4 accent-gold-500"
            />
            <Label htmlFor="fulfillmentModePickup" className="font-normal">
              Local pickup only
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="fulfillmentModeBoth"
              type="radio"
              name="fulfillmentMode"
              value="both"
              defaultChecked={defaultFulfillmentMode === "both"}
              className="size-4 accent-gold-500"
            />
            <Label htmlFor="fulfillmentModeBoth" className="font-normal">
              Both delivery and local pickup
            </Label>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Choose which fulfillment options buyers see at checkout for this listing.
        </p>
      </div>

      {showPrebook ? (
        <div className="flex flex-col gap-1.5">
          <Label>Pre-book</Label>
          <div className="flex items-center gap-2">
            <input
              id="isPrebook"
              type="checkbox"
              name="isPrebook"
              defaultChecked={defaults.isPrebook}
              className="size-4 accent-gold-500"
            />
            <Label htmlFor="isPrebook" className="font-normal">
              Sell as a pre-book reservation (10% off at checkout)
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Buyers see &ldquo;Pre-book now&rdquo; and &ldquo;Notify me&rdquo; instead of the
            normal buy buttons. Unticking this on a published listing emails everyone on the
            notify list that it&apos;s available.
          </p>
        </div>
      ) : null}

      {fundraisers && fundraisers.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fundraiserId">Fundraiser (optional)</Label>
          <Select
            name="fundraiserId"
            defaultValue={defaults.fundraiserId || "none"}
            items={[
              { value: "none", label: "None — EZBZ-direct inventory" },
              ...fundraisers.map((fundraiser) => ({
                value: fundraiser.id,
                label: fundraiser.name,
              })),
            ]}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="None — EZBZ-direct inventory" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None — EZBZ-direct inventory</SelectItem>
              {fundraisers.map((fundraiser) => (
                <SelectItem key={fundraiser.id} value={fundraiser.id}>
                  {fundraiser.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Tags this listing as donated to a fundraiser — proceeds use the fundraiser&apos;s
            reduced commission instead of the standard rate.
          </p>
        </div>
      ) : null}

      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Saving…" : submitLabel}
        </Button>
        {showSaveAndAddAnother ? (
          <Button
            type="submit"
            name="intent"
            value="another"
            variant="outline"
            disabled={pending}
            className="w-fit"
          >
            {pending ? "Saving…" : "Save & add another"}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
