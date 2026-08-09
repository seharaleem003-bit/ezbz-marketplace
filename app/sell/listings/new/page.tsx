import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { ImportPanel } from "./import-panel";
import { createSellerListingAction } from "../actions";

export const metadata: Metadata = {
  title: "Post a listing",
};

export const dynamic = "force-dynamic";

export default async function NewSellerListingPage() {
  const session = await verifySession();
  const seller = await prisma.seller.findUnique({ where: { userId: session.user.id } });
  if (
    !seller ||
    seller.status !== "APPROVED" ||
    !seller.stripeOnboardingComplete ||
    !seller.identityVerifiedAt
  ) {
    redirect("/sell");
  }

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-heading font-semibold">Post a listing</h1>
      <ImportPanel action={createSellerListingAction} categories={categories} />
    </div>
  );
}
