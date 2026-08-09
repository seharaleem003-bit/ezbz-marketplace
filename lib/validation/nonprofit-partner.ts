import { z } from "zod";

export const nonprofitPartnerSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required").max(150),
});

export const linkPartnerContactSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
});
