import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { SELLER_SIGNUP_OPEN } from "@/lib/feature-flags";
import { SellerApplyForm } from "./apply-form";

export const metadata: Metadata = {
  title: "Sell on EZBZ",
};

export default async function SellApplyPage() {
  // The form is unreachable through the UI while signups are closed, but the
  // URL is guessable — send people to the coming-soon page instead.
  if (!SELLER_SIGNUP_OPEN) {
    redirect("/sell");
  }

  const session = await verifySession();

  const existing = await prisma.seller.findUnique({ where: { userId: session.user.id } });
  if (existing) {
    redirect("/sell");
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <h1 className="mb-2 text-2xl font-heading font-semibold">Sell on EZBZ</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Apply to become a seller. Once approved, you&apos;ll connect a payout account and
        verify your identity, then you can post listings — EZBZ takes a flat 15% commission
        (your very first sale is commission-free).
      </p>
      <SellerApplyForm />
    </div>
  );
}
