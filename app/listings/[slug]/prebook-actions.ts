"use server";

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/auth/dal";

const notifySchema = z.object({
  listingId: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  // Loose on purpose — international formats vary and a rejected number here
  // costs a sign-up. Normalisation happens when we actually send.
  phone: z
    .preprocess(
      (value) => (typeof value === "string" && value.trim() !== "" ? value.trim() : undefined),
      z.string().min(6, "Enter a valid phone number").max(32).optional()
    ),
});

export type NotifyMeState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined>; success?: boolean }
  | undefined;

export async function requestPrebookNotifyAction(
  _prevState: NotifyMeState,
  formData: FormData
): Promise<NotifyMeState> {
  const parsed = notifySchema.safeParse({
    listingId: formData.get("listingId"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const listing = await prisma.listing.findUnique({
    where: { id: parsed.data.listingId },
    select: { id: true, status: true },
  });
  if (!listing || listing.status !== "PUBLISHED") {
    return { error: "That listing is no longer available." };
  }

  const session = await getOptionalSession();

  // Re-submitting updates the stored phone instead of creating a duplicate
  // that would get emailed twice at release.
  await prisma.prebookNotifyRequest.upsert({
    where: {
      listingId_email: { listingId: listing.id, email: parsed.data.email },
    },
    update: {
      phone: parsed.data.phone ?? null,
      userId: session?.user?.id ?? undefined,
    },
    create: {
      listingId: listing.id,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      userId: session?.user?.id ?? null,
    },
  });

  return { success: true };
}
