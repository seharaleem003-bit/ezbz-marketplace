import Link from "next/link";
import { Heart } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/auth/dal";
import { getDictionary } from "@/lib/i18n";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: (await getDictionary()).meta.wishlist };
}

export default async function WishlistPage() {
  const dict = await getDictionary();
  const session = await getOptionalSession();

  // Hearting a listing creates a Watch row (see components/listing-heart-button
  // .tsx), so the wishlist is that same set surfaced as a shopping view.
  const saved = session?.user
    ? await prisma.watch.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: {
          listing: {
            include: {
              category: true,
              photos: { orderBy: { sortOrder: "asc" }, take: 1 },
            },
          },
        },
      })
    : [];

  const viewer = session?.user
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { referralCode: true },
      })
    : null;

  if (!session?.user) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
        <Heart className="size-10 text-muted-foreground" />
        <h1 className="text-2xl font-heading font-semibold">{dict.wishlist.signedOutTitle}</h1>
        <p className="max-w-md text-sm text-muted-foreground">{dict.wishlist.signedOutBlurb}</p>
        <Button className="mt-2" render={<Link href="/login" />}>
          {dict.header.logIn}
        </Button>
      </div>
    );
  }

  if (saved.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
        <Heart className="size-10 text-muted-foreground" />
        <h1 className="text-2xl font-heading font-semibold">{dict.wishlist.title}</h1>
        <p className="max-w-md text-sm text-muted-foreground">{dict.wishlist.blurb}</p>
        <Button variant="outline" className="mt-2" render={<Link href="/listings" />}>
          {dict.cart.browseDeals}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-heading font-semibold">{dict.wishlist.heading}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {dict.wishlist.savedCount.replace("{count}", String(saved.length))}
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {saved.map((watch) => (
          <ListingCard
            key={watch.id}
            listing={watch.listing}
            referralCode={viewer?.referralCode}
          />
        ))}
      </div>
    </div>
  );
}
