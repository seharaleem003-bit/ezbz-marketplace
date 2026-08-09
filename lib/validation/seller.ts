import { z } from "zod";

export const sellerApplicationSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(150),
  bio: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? val.trim() : undefined),
    z.string().max(2000).optional()
  ),
  city: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? val.trim() : undefined),
    z.string().max(100).optional()
  ),
  region: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? val.trim() : undefined),
    z.string().max(100).optional()
  ),
});

// The ship-from address Easyship needs to create a shipment on the
// seller's behalf — distinct from the display-only city/region collected
// at apply time, though it reuses those same two fields.
export const sellerShippingAddressSchema = z.object({
  addressLine1: z.string().trim().min(1, "Address is required").max(150),
  addressLine2: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? val.trim() : undefined),
    z.string().max(150).optional()
  ),
  city: z.string().trim().min(1, "City is required").max(100),
  region: z.string().trim().min(1, "State is required").max(100),
  postalCode: z.string().trim().min(1, "Postal code is required").max(20),
  country: z.string().trim().min(1, "Country is required").max(100),
  phone: z.string().trim().min(1, "Phone number is required").max(30),
});

// The seller's stated shipping handling time — what the trust badge's
// on-time-shipping rate (lib/seller-badges.ts) is measured against.
export const handlingDaysSchema = z.object({
  handlingDays: z.coerce
    .number()
    .int("Must be a whole number")
    .min(1, "Must be at least 1 day")
    .max(30, "Must be 30 days or less"),
});
