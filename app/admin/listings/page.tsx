import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
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
import { ListingStatusActions } from "./status-actions";

export const metadata: Metadata = {
  title: "Manage listings",
};

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export default async function AdminListingsPage() {
  const listings = await prisma.listing.findMany({
    orderBy: { updatedAt: "desc" },
    include: { category: true },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-heading font-semibold">Listings</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" render={<Link href="/admin/listings/import" />}>
            Import from file
          </Button>
          <Button render={<Link href="/admin/listings/new" />}>New listing</Button>
        </div>
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
                  <Link href={`/admin/listings/${listing.id}/edit`} className="hover:underline">
                    {listing.title}
                  </Link>
                </TableCell>
                <TableCell>{listing.category.name}</TableCell>
                <TableCell>{STATUS_LABELS[listing.status] ?? listing.status}</TableCell>
                <TableCell>{formatCents(listing.priceCents)}</TableCell>
                <TableCell>{listing.dealScore}</TableCell>
                <TableCell>{listing.inventoryQty}</TableCell>
                <TableCell>
                  <ListingStatusActions listingId={listing.id} status={listing.status} />
                </TableCell>
              </TableRow>
            ))}
            {listings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No listings yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
