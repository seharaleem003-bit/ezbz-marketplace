import { z } from "zod";

export const addressSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(100),
  line1: z.string().trim().min(1, "Address is required").max(150),
  line2: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? val.trim() : undefined),
    z.string().max(150).optional()
  ),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(1, "State is required").max(100),
  postalCode: z.string().trim().min(1, "Postal code is required").max(20),
  country: z.string().trim().min(1, "Country is required").max(100),
});

export type AddressInput = z.infer<typeof addressSchema>;
