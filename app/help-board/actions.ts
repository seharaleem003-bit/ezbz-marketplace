"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { auth } from "@/lib/auth";

export type SponsorNeedState = { error?: string } | undefined;

const amountSchema = z.preprocess((val) => {
  if (typeof val !== "string" || val.trim() === "") return undefined;
  const num = Number(val);
  return Number.isNaN(num) ? undefined : num;
}, z.number().min(1, "Minimum contribution is $1"));

export async function sponsorNeedAction(
  needId: string,
  _prevState: SponsorNeedState,
  formData: FormData
): Promise<SponsorNeedState> {
  const parsedAmount = amountSchema.safeParse(formData.get("amount"));
  if (!parsedAmount.success) {
    return { error: parsedAmount.error.issues[0]?.message ?? "Enter a valid amount." };
  }

  const need = await prisma.helpBoardNeed.findUnique({ where: { id: needId } });
  if (!need || need.status !== "OPEN") {
    return { error: "This need is no longer accepting contributions." };
  }

  const session = await auth();
  const amountCents = Math.round(parsedAmount.data * 100);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const stripe = getStripe();
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: session?.user?.email ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: `Contribution: ${need.title}`,
            description: "EZBZ Help Board — Sponsor a Need",
          },
        },
      },
    ],
    metadata: {
      helpBoardNeedId: needId,
      contributorUserId: session?.user?.id ?? "",
    },
    success_url: `${appUrl}/help-board?contributed=1`,
    cancel_url: `${appUrl}/help-board`,
  });

  if (!checkoutSession.url) {
    return { error: "Could not start checkout. Please try again." };
  }

  redirect(checkoutSession.url);
}
