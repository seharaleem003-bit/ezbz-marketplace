import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import type { Metadata } from "next";
import { Flag, Heart, Share2 } from "lucide-react";

import { getListingBySlug } from "@/lib/listings";
import { formatCents, formatCondition, formatJoinedDate } from "@/lib/format";
import { getOptionalSession } from "@/lib/auth/dal";
import { getDictionary, getLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { DiscountBadge, calculateDiscount } from "@/components/discount-badge";
import { ListingGallery } from "./listing-gallery";
import { RecommendationRow } from "@/components/recommendation-row";
import { ProductSchema } from "@/components/product-schema";
import { getSimilarListings, getBoughtTogether } from "@/lib/recommendations";
import { isDurableStorageConfigured } from "@/lib/storage";
import { CornerRibbon, ribbonFor } from "@/components/corner-ribbon";
import { NotifyMeDialog } from "@/components/notify-me-dialog";
import { AmazonPriceCompare } from "@/components/amazon-price-compare";
import { VideoWalkaround } from "@/components/video-walkaround";
import { ListingHeartButton } from "@/components/listing-heart-button";
import { ListingShareButton } from "@/components/listing-share-button";
import { SupportTicketDialog } from "@/components/support-ticket-dialog";
import { SellerTrustBadges } from "@/components/seller-trust-badges";
import { AddToCartForm } from "./add-to-cart-form";
import { BuyNowButton } from "./buy-now-button";
import { PrebookPanel } from "./prebook-panel";
import { ChatSellerDialog } from "./chat-seller-dialog";
import { QUICK_MESSAGES, QUICK_MESSAGES_ES } from "@/lib/messaging";
import { prebookDiscountFor } from "@/lib/prebook";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Deliberately resolved here rather than only in the page body. This route
  // has a loading.tsx, so Next streams a shell and commits HTTP 200 before the
  // component runs — calling notFound() down there produced a "soft 404": the
  // right page with a 200 status, which Google treats as a thin duplicate and
  // will happily index. generateMetadata runs before the response starts, so
  // the status is still ours to set.
  const session = await getOptionalSession();
  const canSeeDrafts = session?.user?.role === "ADMIN" || session?.user?.role === "STAFF";
  const listing = await getListingBySlug(slug, canSeeDrafts);
  if (!listing) notFound();

  // Purpose-written SEO copy wins when it exists; otherwise fall back to the
  // listing's own title and description.
  const title = listing.metaTitle ?? listing.title;
  const description = listing.metaDescription ?? listing.description.slice(0, 160);

  return {
    title,
    description,
    alternates: { canonical: `/listings/${listing.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: listing.photos[0]?.url ? [listing.photos[0].url] : undefined,
    },
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getOptionalSession();
  const canSeeDrafts =
    session?.user?.role === "ADMIN" || session?.user?.role === "STAFF";
  const listing = await getListingBySlug(slug, canSeeDrafts);
  if (!listing) notFound();

  const dict = await getDictionary();
  const existingWatch = session?.user
    ? await prisma.watch.findUnique({
        where: { userId_listingId: { userId: session.user.id, listingId: listing.id } },
      })
    : null;

  // Only signed-in users get a tagged share link — there's nobody to pay
  // otherwise, so anonymous shares stay plain.
  const viewer = session?.user
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { referralCode: true },
      })
    : null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const listingUrl = `${appUrl}/listings/${listing.slug}`;
  const qrCodeDataUrl = await QRCode.toDataURL(listingUrl, {
    margin: 1,
    width: 240,
    color: { dark: "#0a1930", light: "#ffffff" },
  });

  const discount = calculateDiscount({
    priceCents: listing.priceCents,
    amazonPriceCents: listing.amazonPriceCents,
    retailPriceCents: listing.retailPriceCents,
  });

  const locale = await getLocale();
  const prebookSavingCents = listing.isPrebook ? prebookDiscountFor(listing.priceCents) : 0;
  const ribbon = ribbonFor(listing);

  const sellerName = listing.seller?.displayName ?? "EZBZ";
  const locationLabel = listing.seller
    ? [listing.seller.city, listing.seller.region].filter(Boolean).join(", ")
    : "";
  const inStock = listing.inventoryQty > 0;

  const [similar, boughtTogether] = await Promise.all([
    getSimilarListings({
      listingId: listing.id,
      categoryId: listing.categoryId,
      priceCents: listing.priceCents,
    }),
    getBoughtTogether({ listingId: listing.id, categoryId: listing.categoryId }),
  ]);
  const recLabels = {
    off: dict.listing.off,
    vsAmazon: dict.listing.vsAmazon,
    offRetail: dict.listing.offRetail,
    outOfStock: dict.listing.outOfStock,
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      {/* Structured data only for pages shoppers can reach — a draft indexed
          by Google would be a dead link. */}
      {listing.status === "PUBLISHED" ? (
        <ProductSchema
          product={{
            name: listing.title,
            description: listing.metaDescription ?? listing.description,
            url: listingUrl,
            images: listing.photos.map((photo) => photo.url),
            priceCents: listing.priceCents,
            condition: listing.condition,
            // A pre-book is orderable even at zero stock, and telling Google
            // otherwise would suppress it from Shopping results.
            inStock: inStock || listing.isPrebook,
            categoryPath: [listing.category.name],
            sku: listing.slug,
          }}
        />
      ) : null}

      {/* Only reachable by admin/staff — a shopper hitting an unpublished slug
          gets a 404, so this can't leak. */}
      {listing.status !== "PUBLISHED" ? (
        <div className="mb-6 rounded-lg border border-gold-500 bg-gold-500/10 px-4 py-3 text-sm">
          <strong>Preview — {listing.status.toLowerCase()}.</strong> Shoppers can&apos;t see this
          page. An admin can publish it from{" "}
          <Link href="/admin/listings" className="underline">
            Listings
          </Link>
          .
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
      <ListingGallery
        photos={listing.photos.map((photo) => ({
          id: photo.id,
          url: photo.url,
          altText: photo.altText,
        }))}
        title={listing.title}
        labels={{ previous: dict.home.previousListing, next: dict.home.nextListing }}
        ribbon={
          ribbon ? (
            <CornerRibbon
              kind={ribbon}
              label={ribbon === "sold" ? dict.listing.ribbonSold : dict.listing.ribbonPrebook}
              className="size-32"
            />
          ) : null
        }
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-semibold">{formatCents(listing.priceCents)}</span>
            {listing.retailPriceCents && listing.retailPriceCents > listing.priceCents ? (
              <span className="text-lg text-muted-foreground line-through">
                {formatCents(listing.retailPriceCents)}
              </span>
            ) : null}
            {discount ? (
              <DiscountBadge
                discount={discount}
                labels={{
                  off: dict.listing.off,
                  vsAmazon: dict.listing.vsAmazon,
                  offRetail: dict.listing.offRetail,
                }}
              />
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
            <ListingShareButton
              title={listing.title}
              url={listingUrl}
              referralCode={viewer?.referralCode}
              ariaLabel={dict.listing.shareLabel}
              labels={dict.share}
            />
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

        {/* No "posted N days ago": stock is loaded in bulk, so the date says
            something about when the catalogue was imported, not about the item,
            and makes fresh inventory read as stale. */}
        {locationLabel ? (
          <p className="text-sm text-muted-foreground">{locationLabel}</p>
        ) : null}

        {/* The seller card is provenance for third-party listings. On
            EZBZ-direct stock it just repeats our own name back at the shopper,
            so it only renders when there's an actual seller behind the item. */}
        {listing.seller ? (
          <>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-white">
                {sellerName.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <Link href={`/shops/${listing.seller.id}`} className="font-medium hover:underline">
                  {sellerName}
                </Link>
                <p className="text-xs text-muted-foreground">
                  Joined {formatJoinedDate(listing.seller.createdAt)}
                </p>
              </div>
            </div>
            <SellerTrustBadges
              badgeTier={listing.seller.badgeTier}
              identityVerified={listing.seller.stripeOnboardingComplete}
            />
          </>
        ) : null}

        <AmazonPriceCompare
          title={listing.title}
          ezbzPriceCents={listing.priceCents}
          amazonPriceCents={listing.amazonPriceCents}
          amazonUrl={listing.amazonUrl}
          amazonPriceCheckedAt={listing.amazonPriceCheckedAt}
        />

        {listing.isPrebook ? (
          <PrebookPanel
            listingId={listing.id}
            releaseAt={
              listing.prebookReleaseAt
                ? listing.prebookReleaseAt.toLocaleDateString(
                    locale === "es" ? "es-ES" : "en-US",
                    { month: "long", day: "numeric", year: "numeric" }
                  )
                : null
            }
            fullPriceLabel={formatCents(listing.priceCents)}
            discountedPriceLabel={formatCents(listing.priceCents - prebookSavingCents)}
            savingLabel={t(dict.listing.youSave, { amount: formatCents(prebookSavingCents) })}
            deliveryNote={dict.listing.prebookDeliveryNote}
            labels={{
              prebookNow: dict.listing.prebookNow,
              notifyMe: dict.listing.notifyMe,
              reserving: dict.listing.reserving,
              releaseOn: dict.listing.releaseOn,
              discountNote: dict.listing.prebookDiscountNote,
              notifyTitle: dict.listing.notifyTitle,
              notifyBlurb: dict.listing.notifyBlurb,
              email: dict.listing.notifyEmail,
              phone: dict.listing.notifyPhone,
              phoneOptional: dict.listing.notifyPhoneOptional,
              submit: dict.listing.notifySubmit,
              submitting: dict.listing.notifySubmitting,
              successTitle: dict.listing.notifySuccessTitle,
              successBlurb: dict.listing.notifySuccessBlurb,
            }}
          />
        ) : (
          <>
            <div className="flex gap-3">
              <ChatSellerDialog
                attachmentsEnabled={isDurableStorageConfigured() || process.env.NODE_ENV !== "production"}
                listingId={listing.id}
                sellerName={sellerName}
                quickMessages={locale === "es" ? QUICK_MESSAGES_ES : QUICK_MESSAGES}
                labels={{
                  trigger: dict.listing.chatTrigger,
                  title: dict.listing.chatTitle,
                  blurb: dict.listing.chatBlurb,
                  placeholder: dict.listing.chatPlaceholder,
                  send: dict.listing.chatSend,
                  sending: dict.listing.chatSending,
                  sentTitle: dict.listing.chatSentTitle,
                  sentBlurb: dict.listing.chatSentBlurb,
                  viewMessages: dict.listing.chatViewMessages,
                  signInPrompt: dict.listing.chatSignInPrompt,
                  signIn: dict.listing.chatSignIn,
                }}
              />
              <BuyNowButton
                listingId={listing.id}
                inStock={inStock}
                labels={{ buyNow: dict.listing.buyNow, outOfStock: dict.listing.outOfStock }}
              />
            </div>

            <AddToCartForm listingId={listing.id} inStock={inStock} />

            {/* Sold out and not a pre-book: capture demand instead of losing
                the visitor entirely. */}
            {!inStock ? (
              <NotifyMeDialog
                listingId={listing.id}
                fullWidth
                labels={{
                  trigger: dict.listing.notifyMe,
                  title: dict.listing.notifyTitle,
                  blurb: dict.listing.notifyBlurb,
                  email: dict.listing.notifyEmail,
                  phone: dict.listing.notifyPhone,
                  phoneOptional: dict.listing.notifyPhoneOptional,
                  submit: dict.listing.notifySubmit,
                  submitting: dict.listing.notifySubmitting,
                  successTitle: dict.listing.notifySuccessTitle,
                  successBlurb: dict.listing.notifySuccessBlurb,
                }}
              />
            ) : null}
          </>
        )}

        <div className="flex items-start gap-2 rounded-lg border border-gold-500/40 bg-gold-500/5 p-3 text-sm">
          <Share2 className="mt-0.5 size-4 shrink-0 text-gold-600" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">
              {dict.listing.shareEarnTitle}
            </span>{" "}
            {viewer?.referralCode ? (
              <>{dict.listing.shareEarnSignedIn}</>
            ) : (
              <>
                <Link href="/login" className="font-medium text-foreground underline">
                  Sign in
                </Link>{" "}
                and share this listing — if someone buys it, you earn 2% of the sale as store
                credit.
              </>
            )}
          </p>
        </div>

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

      <RecommendationRow
        heading={dict.listing.boughtTogetherHeading}
        subheading={
          boughtTogether.basis === "co-purchase"
            ? dict.listing.boughtTogetherReal
            : dict.listing.boughtTogetherSuggested
        }
        items={boughtTogether.items}
        labels={recLabels}
      />

      <RecommendationRow
        heading={dict.listing.similarHeading}
        items={similar}
        labels={recLabels}
      />
    </div>
  );
}
