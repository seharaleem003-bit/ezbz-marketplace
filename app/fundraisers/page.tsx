import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Fundraisers",
};

export const dynamic = "force-dynamic";

export default async function FundraisersPage() {
  const fundraisers = await prisma.fundraiser.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { listings: true } } },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Fundraisers</h1>
          <p className="text-sm text-muted-foreground">
            Shop items donated to support schools, churches, and community groups.
          </p>
        </div>
        <Button variant="outline" render={<Link href="/fundraisers/apply" />}>
          Start a fundraiser
        </Button>
      </div>

      {fundraisers.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          No active fundraisers right now — check back soon.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {fundraisers.map((fundraiser) => (
            <Link
              key={fundraiser.id}
              href={`/fundraisers/${fundraiser.slug}`}
              className="flex flex-col gap-1.5 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-shadow hover:shadow-md"
            >
              <h2 className="font-medium">{fundraiser.name}</h2>
              <p className="line-clamp-2 text-sm text-muted-foreground">{fundraiser.cause}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {fundraiser._count.listings} listing
                {fundraiser._count.listings === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
