import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { ProviderTrustBadges } from "@/components/provider-trust-badges";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const provider = await prisma.serviceProvider.findFirst({ where: { id, status: "ACTIVE" } });
  if (!provider) return {};
  return { title: provider.businessName };
}

export default async function ProviderProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const provider = await prisma.serviceProvider.findFirst({
    where: { id, status: "ACTIVE" },
    include: { category: true },
  });
  if (!provider) notFound();

  const location = [provider.city, provider.region].filter(Boolean).join(", ");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href={`/services/${provider.category.slug}`}
        className="text-sm text-muted-foreground underline"
      >
        ← {provider.category.name}
      </Link>

      <div className="mt-2 rounded-xl bg-navy-900 p-6 text-white">
        <p className="text-xs font-medium uppercase tracking-widest text-gold-400">
          {provider.category.name}
        </p>
        <h1 className="mt-1 text-2xl font-heading font-semibold">{provider.businessName}</h1>
        <ProviderTrustBadges
          identityVerified={Boolean(provider.identityVerifiedAt)}
          backgroundCheckClear={provider.backgroundCheckStatus === "CLEAR"}
          className="mt-2"
          tone="dark"
        />
        {location ? <p className="mt-2 text-sm text-white/60">{location}</p> : null}
      </div>

      <p className="mt-6 whitespace-pre-line text-sm text-muted-foreground">
        {provider.description}
      </p>
    </div>
  );
}
