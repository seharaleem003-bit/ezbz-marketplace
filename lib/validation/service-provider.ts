import { z } from "zod";

export const providerApplicationSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required").max(150),
  categoryId: z.string().trim().min(1, "Please choose a category"),
  description: z.string().trim().min(1, "Description is required").max(2000),
  city: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? val.trim() : undefined),
    z.string().max(100).optional()
  ),
  region: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? val.trim() : undefined),
    z.string().max(100).optional()
  ),
});

export type ProviderApplicationInput = z.infer<typeof providerApplicationSchema>;
