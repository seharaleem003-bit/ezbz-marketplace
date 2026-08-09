import { z } from "zod";

// formData.get() returns null (not undefined) for a field that isn't
// rendered — e.g. the pickup toggle is omitted entirely when no cart item
// supports pickup — and z.enum().default() only substitutes on undefined,
// not null, so normalize null to undefined first.
const shippingMethodSchema = z.preprocess(
  (val) => (val === null || val === "" ? undefined : val),
  z.enum(["DELIVERY", "PICKUP"]).default("DELIVERY")
);

export const checkoutSchema = z.object({
  shippingName: z.string().trim().min(1, "Name is required").max(100),
  shippingLine1: z.string().trim().min(1, "Address is required").max(150),
  shippingLine2: z.string().trim().max(150).optional().or(z.literal("")),
  shippingCity: z.string().trim().min(1, "City is required").max(100),
  shippingState: z.string().trim().min(1, "State is required").max(100),
  shippingPostal: z.string().trim().min(1, "Postal code is required").max(20),
  shippingCountry: z.string().trim().min(1, "Country is required").max(100),
  shippingMethod: shippingMethodSchema,
});

// Used on the "use a saved address" path, where only the shipping method
// still comes from a raw form field.
export const shippingMethodOnlySchema = z.object({
  shippingMethod: shippingMethodSchema,
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

// Fields shared by both the "use a saved address" and "enter a new address"
// paths — the resolved shape placeOrderAction actually needs, regardless of
// which one the buyer picked.
export type ResolvedShipping = {
  shippingName: string;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPostal: string;
  shippingCountry: string;
};
