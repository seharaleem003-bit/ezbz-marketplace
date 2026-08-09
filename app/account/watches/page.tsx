import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { formatCents } from "@/lib/format";
import { RemoveWatchButton } from "./remove-watch-button";

export const metadata: Metadata = {
  title: "My watches",
};

export const dynamic = "force-dynamic";

export default async function WatchesPage() {
  const session = await verifySession();

  const watches = await prisma.watch.findMany({
    where: { userId: session.user.id },
    include: { listing: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-heading font-semibold">My watches</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Items you&apos;re tracking for a price drop.
      </p>

      {watches.length === 0 ? (
        <p className="text-muted-foreground">
          You&apos;re not watching any items yet.{" "}
          <Link href="/listings" className="underline">
            Browse deals
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {watches.map((watch) => {
            const priceDropCents = watch.priceCentsAtWatch - watch.listing.priceCents;
            return (
              <li
                key={watch.id}
                className="flex items-center justify-between gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
              >
                <div>
                  <Link
                    href={`/listings/${watch.listing.slug}`}
                    className="font-medium hover:underline"
                  >
                    {watch.listing.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    Watched at {formatCents(watch.priceCentsAtWatch)} · Now{" "}
                    {formatCents(watch.listing.priceCents)}
                  </p>
                  {priceDropCents > 0 ? (
                    <p className="text-sm font-medium text-emerald-600">
                      Down {formatCents(priceDropCents)}!
                    </p>
                  ) : null}
                </div>
                <RemoveWatchButton watchId={watch.id} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
