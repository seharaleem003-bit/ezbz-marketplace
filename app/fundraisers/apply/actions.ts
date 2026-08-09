"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { fundraiserApplicationSchema } from "@/lib/validation/fundraiser";

export type FundraiserApplyState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function applyForFundraiserAction(
  _prevState: FundraiserApplyState,
  formData: FormData
): Promise<FundraiserApplyState> {
  const session = await verifySession();

  const parsed = fundraiserApplicationSchema.safeParse({
    name: formData.get("name"),
    cause: formData.get("cause"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const baseSlug = slugify(parsed.data.name) || "fundraiser";
  let slug = baseSlug;
  for (let attempt = 0; attempt < 20; attempt++) {
    const existing = await prisma.fundraiser.findUnique({ where: { slug } });
    if (!existing) break;
    slug = `${baseSlug}-${attempt + 2}`;
  }

  await prisma.fundraiser.create({
    data: {
      organizerUserId: session.user.id,
      name: parsed.data.name,
      slug,
      cause: parsed.data.cause,
    },
  });

  redirect("/fundraisers/apply/submitted");
}
