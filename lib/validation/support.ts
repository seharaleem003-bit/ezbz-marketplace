import { z } from "zod";

export const supportTicketSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  message: z.string().trim().min(1, "Tell us what's going on").max(2000),
});
