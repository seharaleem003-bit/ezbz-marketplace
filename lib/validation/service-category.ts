import { z } from "zod";

export const serviceCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  group: z.string().trim().min(1, "Group is required").max(100),
  sortOrder: z.preprocess((val) => {
    if (typeof val !== "string" || val.trim() === "") return 0;
    const num = Number(val);
    return Number.isNaN(num) ? 0 : num;
  }, z.number().int()),
});

export type ServiceCategoryInput = z.infer<typeof serviceCategorySchema>;
