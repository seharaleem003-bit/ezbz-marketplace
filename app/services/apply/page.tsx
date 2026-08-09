import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { ProviderApplyForm } from "./apply-form";

export const metadata: Metadata = {
  title: "List your services on EZBZ",
};

export const dynamic = "force-dynamic";

export default async function ProviderApplyPage() {
  const session = await verifySession();

  const existing = await prisma.serviceProvider.findUnique({ where: { userId: session.user.id } });
  if (existing) redirect("/provider");

  const categories = await prisma.serviceCategory.findMany({
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, group: true },
  });

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <h1 className="mb-2 text-2xl font-heading font-semibold">List your services on EZBZ</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        A flat subscription fee keeps your listing active — no per-job commission. Because
        service providers often work in customers&apos; homes, you&apos;ll also need to pass
        identity and background verification before your listing goes live.
      </p>
      <ProviderApplyForm categories={categories} />
    </div>
  );
}
