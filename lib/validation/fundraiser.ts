import { z } from "zod";

export const fundraiserApplicationSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required").max(150),
  cause: z.string().trim().min(1, "Tell us about your cause").max(2000),
});

export const helpBoardNeedSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(2000),
  goal: z.preprocess((val) => {
    if (typeof val !== "string" || val.trim() === "") return undefined;
    const num = Number(val);
    return Number.isNaN(num) ? undefined : num;
  }, z.number().positive("Goal must be greater than 0")),
  nonprofitPartnerId: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? val : undefined),
    z.string().optional()
  ),
});
