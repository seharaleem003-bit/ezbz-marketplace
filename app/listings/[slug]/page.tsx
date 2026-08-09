import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import type { Metadata } from "next";
import { Flag, Heart } from "lucide-react";

import { getListingBySlug } from "@/lib/listings";
import { formatCents, formatCondition, formatJoinedDate, formatRelativeTime } from "@/lib/format";
import { getOptionalSession } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { DealScoreBadge } from "@/components/deal-score-badge";
import { AmazonPriceCompare } from "@/components/amazon-price-compare";
import { VideoWalkaround } from "@/components/video-walkaround";
import { ListingHeartButton } from "@/components/listing-heart-button";
import { ListingShareButton } from "@/components/listing-share-button";
import { SupportTicketDialog } from "@/components/support-ticket-dialog";
import { SellerTrustBadges } from "@/components/seller-trust-badges";
import { AddToCartForm } from "./add-to-cart-form";
import { BuyNowButton } from "./buy-now-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) return {};

  return {
    title: listing.title,
    description: listing.description.slice(0, 160),
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) notFound();

  const session = await getOptionalSession();
  const existingWatch = session?.user
    ? await prisma.watch.findUnique({
        where: { userId_listingId: { userId: session.user.id, listingId: listing.id } },
      })
    : null;

  const [heroPhoto, ...restPhotos] = listing.photos;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const listingUrl = `${appUrl}/listings/${listing.slug}`;
  const qrCodeDataUrl = await QRCode.toDataURL(listingUrl, {
    margin: 1,
    width: 240,
    color: { dark: "#0a1930", light: "#ffffff" },
  });

  const sellerName = listing.seller?.displayName ?? "EZBZ";
  const locationLabel = listing.seller
    ? [listing.seller.city, listing.seller.region].filter(Boolean).join(", ")
    : "";
  const inStock = listing.inventoryQty > 0;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-muted">
          {heroPhoto ? (
            <Image
              src={heroPhoto.url}
              alt={heroPhoto.altText ?? listing.title}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          ) : null}
          <DealScoreBadge score={listing.dealScore} size="lg" className="absolute left-3 top-3" />
        </div>
        {restPhotos.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {restPhotos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square overflow-hidden rounded-lg bg-muted"
              >
                <Image
                  src={photo.url}
                  alt={photo.altText ?? listing.title}
                  fill
                  sizes="120px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold">{formatCents(listing.priceCents)}</span>
            {listing.retailPriceCents && listing.retailPriceCents > listing.priceCents ? (
              <span className="text-lg text-muted-foreground line-through">
                {formatCents(listing.retailPriceCents)}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-4 pt-1">
            {session?.user ? (
              <ListingHeartButton
                listingId={listing.id}
                initialWatching={Boolean(existingWatch)}
              />
            ) : (
              <Link
                href="/login"
                aria-label="Log in to save this listing"
                className="text-muted-foreground hover:text-foreground"
              >
                <Heart className="size-6" />
              </Link>
            )}
            <ListingShareButton title={listing.title} />
            <SupportTicketDialog
              trigger={<Flag className="size-6" />}
              triggerClassName="text-muted-foreground hover:text-foreground"
              dialogTitle="Report this listing"
              description={`Let us know what's wrong with "${listing.title}" and our team will take a look.`}
              defaultMessage={`Reporting listing: ${listing.title} (${listingUrl})\n\n`}
              submitLabel="Submit report"
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {listing.category.name} &middot; {formatCondition(listing.condition)}
          </p>
          <h1 className="text-2xl font-heading font-semibold">{listing.title}</h1>
        </div>

        <p className="text-sm text-muted-foreground">
          Posted {formatRelativeTime(listing.createdAt)}
          {locationLabel ? ` in ${locationLabel}` : ""}
        </p>

        <div className="flex items-center gap-3 rounded-lg border p-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-white">
            {sellerName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            {listing.seller ? (
              <Link href={`/shops/${listing.seller.id}`} className="font-medium hover:underline">
                {sellerName}
              </Link>
            ) : (
              <span className="font-medium">{sellerName}</span>
            )}
            <p className="text-xs text-muted-foreground">
              Joined {formatJoinedDate(listing.seller?.createdAt ?? listing.createdAt)}
            </p>
          </div>
        </div>
        {listing.seller ? (
          <SellerTrustBadges
            badgeTier={listing.seller.badgeTier}
            identityVerified={listing.seller.stripeOnboardingComplete}
          />
        ) : null}

        <AmazonPriceCompare
          ezbzPriceCents={listing.priceCents}
          amazonPriceCents={listing.amazonPriceCents}
          amazonUrl={listing.amazonUrl}
          amazonPriceCheckedAt={listing.amazonPriceCheckedAt}
        />

        <div className="flex gap-3">
          <SupportTicketDialog
            trigger="Ask"
            triggerClassName="flex h-10 flex-1 items-center justify-center rounded-lg border border-gold-500 text-sm font-semibold text-gold-600 hover:bg-gold-500/10"
            dialogTitle={`Ask about "${listing.title}"`}
            description="Send a question to our team about this listing and we'll reply by email."
            defaultMessage={`Question about: ${listing.title} (${listingUrl})\n\n`}
            submitLabel="Send question"
          />
          <BuyNowButton listingId={listing.id} inStock={inStock} />
        </div>

        <AddToCartForm listingId={listing.id} inStock={inStock} />

        {listing.inventoryQty <= 0 ? (
          <p className="text-sm text-destructive">Out of stock</p>
        ) : listing.inventoryQty <= 3 ? (
          <p className="text-sm text-muted-foreground">Only {listing.inventoryQty} left</p>
        ) : null}

        <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {listing.description}
        </p>

        <VideoWalkaround videos={listing.videos} />

        <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/40 p-4">
          <div>
            <p className="font-medium">Chat securely on the app</p>
            <div className="mt-3 flex items-center gap-2">
              <a
                href="#"
                className="flex h-10 items-center gap-2 rounded-lg bg-black px-3 text-white"
              >
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-[10px]">Download on the</span>
                  <span className="text-sm font-semibold">App Store</span>
                </span>
              </a>
              <a
                href="#"
                className="flex h-10 items-center gap-2 rounded-lg bg-black px-3 text-white"
              >
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-[10px]">GET IT ON</span>
                  <span className="text-sm font-semibold">Google Play</span>
                </span>
              </a>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI, next/image can't optimize it and doesn't need to */}
          <img src={qrCodeDataUrl} alt="QR code to this listing" className="size-24 shrink-0" />
        </div>
      </div>
    </div>
  );
}
