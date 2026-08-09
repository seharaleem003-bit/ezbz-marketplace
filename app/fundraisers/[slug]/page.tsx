import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { ListingCard } from "@/components/listing-card";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const fundraiser = await prisma.fundraiser.findFirst({ where: { slug, status: "APPROVED" } });
  if (!fundraiser) return {};
  return { title: fundraiser.name };
}

export default async function FundraiserDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const fundraiser = await prisma.fundraiser.findFirst({
    where: { slug, status: "APPROVED" },
    include: {
      organizer: { select: { name: true } },
      listings: {
        where: { status: "PUBLISHED" },
        include: { category: true, photos: { orderBy: { sortOrder: "asc" }, take: 1 } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!fundraiser) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-8 rounded-xl bg-navy-900 p-6 text-white">
        <p className="text-xs font-medium uppercase tracking-widest text-gold-400">Fundraiser</p>
        <h1 className="mt-1 text-2xl font-heading font-semibold">{fundraiser.name}</h1>
        <p className="mt-2 max-w-2xl text-white/80">{fundraiser.cause}</p>
        {fundraiser.organizer.name ? (
          <p className="mt-2 text-sm text-white/60">Organized by {fundraiser.organizer.name}</p>
        ) : null}
      </div>

      <h2 className="mb-4 text-lg font-medium">Items donated to this fundraiser</h2>
      {fundraiser.listings.length === 0 ? (
        <p className="text-muted-foreground">No items listed yet — check back soon.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {fundraiser.listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
