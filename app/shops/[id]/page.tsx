import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { ListingCard } from "@/components/listing-card";
import { SellerTrustBadges } from "@/components/seller-trust-badges";
import { CommunityGiverBadge } from "@/components/community-giver-badge";
import { isCommunityGiver } from "@/lib/community-giver";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const seller = await prisma.seller.findFirst({ where: { id, status: "APPROVED" } });
  if (!seller) return {};
  return { title: seller.displayName };
}

export default async function ShopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const seller = await prisma.seller.findFirst({
    where: { id, status: "APPROVED" },
    include: {
      listings: {
        where: { status: "PUBLISHED" },
        include: { category: true, photos: { orderBy: { sortOrder: "asc" }, take: 1 } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!seller) notFound();

  const location = [seller.city, seller.region].filter(Boolean).join(", ");
  const isGiver = await isCommunityGiver(seller.userId);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-8 rounded-xl bg-navy-900 p-6 text-white">
        <p className="text-xs font-medium uppercase tracking-widest text-gold-400">EZBZ Seller</p>
        <h1 className="mt-1 text-2xl font-heading font-semibold">{seller.displayName}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <SellerTrustBadges
            badgeTier={seller.badgeTier}
            identityVerified={seller.stripeOnboardingComplete}
            tone="dark"
          />
          {isGiver ? <CommunityGiverBadge tone="dark" /> : null}
        </div>
        {location ? <p className="mt-2 text-sm text-white/60">{location}</p> : null}
        {seller.bio ? <p className="mt-2 max-w-2xl text-white/80">{seller.bio}</p> : null}
      </div>

      <h2 className="mb-4 text-lg font-medium">
        {seller.listings.length} item{seller.listings.length === 1 ? "" : "s"} for sale
      </h2>
      {seller.listings.length === 0 ? (
        <p className="text-muted-foreground">No items listed yet — check back soon.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {seller.listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
