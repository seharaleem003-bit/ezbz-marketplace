import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { formatCents } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SellerListingStatusActions } from "./status-actions";

export const metadata: Metadata = {
  title: "My listings",
};

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export default async function SellerListingsPage() {
  const session = await verifySession();
  const seller = await prisma.seller.findUnique({ where: { userId: session.user.id } });
  if (!seller) redirect("/sell");

  const listings = await prisma.listing.findMany({
    where: { sellerId: seller.id },
    orderBy: { updatedAt: "desc" },
    include: { category: true },
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-heading font-semibold">My listings</h1>
        <Button render={<Link href="/sell/listings/new" />}>Post a listing</Button>
      </div>

      <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Deal Score</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listings.map((listing) => (
              <TableRow key={listing.id}>
                <TableCell className="max-w-64 truncate font-medium">
                  <Link href={`/sell/listings/${listing.id}/edit`} className="hover:underline">
                    {listing.title}
                  </Link>
                </TableCell>
                <TableCell>{listing.category.name}</TableCell>
                <TableCell>{STATUS_LABELS[listing.status] ?? listing.status}</TableCell>
                <TableCell>{formatCents(listing.priceCents)}</TableCell>
                <TableCell>{listing.dealScore}</TableCell>
                <TableCell>{listing.inventoryQty}</TableCell>
                <TableCell>
                  <SellerListingStatusActions listingId={listing.id} status={listing.status} />
                </TableCell>
              </TableRow>
            ))}
            {listings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  You haven&apos;t posted any listings yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
