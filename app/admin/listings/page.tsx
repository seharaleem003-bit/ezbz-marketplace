import Image from "next/image";
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
import { requireCatalogAccess } from "@/lib/auth/dal";
import { DeleteListingButton } from "./delete-button";

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
  const session = await requireCatalogAccess();
  const isAdmin = session.user.role === "ADMIN";

  const listings = await prisma.listing.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      category: true,
      photos: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-heading font-semibold">Listings</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" render={<Link href="/admin/listings/prices" />}>
            Amazon prices
          </Button>
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
              <TableHead className="w-16">Photo</TableHead>
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
                <TableCell>
                  {listing.photos[0]?.url ? (
                    <Image
                      src={listing.photos[0].url}
                      alt=""
                      width={44}
                      height={44}
                      className="size-11 rounded-md object-contain ring-1 ring-foreground/10"
                    />
                  ) : (
                    // A visible placeholder, so a listing with no photo is
                    // obvious in the list rather than a blank cell.
                    <span className="flex size-11 items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground">
                      none
                    </span>
                  )}
                </TableCell>
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
                  {/* Opens in a new tab so the admin doesn't lose their place
                      in the list. Drafts are visible here to admin/staff only. */}
                  {/* One flex row, so the trash icon sits beside the status
                      buttons instead of wrapping onto its own line. */}
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      href={`/listings/${listing.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mr-1 text-sm text-navy-800 hover:underline"
                    >
                      Preview
                    </Link>
                    <ListingStatusActions listingId={listing.id} status={listing.status} />
                    {isAdmin ? (
                      <DeleteListingButton listingId={listing.id} title={listing.title} />
                    ) : null}
                  </div>
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
