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
import {
  BulkDeleteBar,
  BulkSelectAllCheckbox,
  BulkSelectCheckbox,
  BulkSelectProvider,
} from "./bulk-select";
import { StockInput } from "./stock-input";
import { ListingSearchForm } from "./search-form";

export const metadata: Metadata = {
  title: "Manage listings",
};

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

/** Short, unambiguous date — "3 Sep 2026" rather than a locale-dependent 3/9. */
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireCatalogAccess();
  const isAdmin = session.user.role === "ADMIN";
  const query = (await searchParams).q?.trim() ?? "";

  // Matches the fields an operator would actually search by: the product name,
  // its category, the SEO keywords written for it, and the slug.
  const where = query
    ? {
        OR: [
          { title: { contains: query, mode: "insensitive" as const } },
          { description: { contains: query, mode: "insensitive" as const } },
          { slug: { contains: query, mode: "insensitive" as const } },
          { searchKeywords: { contains: query, mode: "insensitive" as const } },
          { category: { name: { contains: query, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const listings = await prisma.listing.findMany({
    where,
    // Deliberately NOT updatedAt: editing stock in the table changes
    // updatedAt, which made the row you were typing in jump to the top and
    // look like the edit had been lost. Creation order never moves.
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      photos: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
    },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
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

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ListingSearchForm initialQuery={query} />
        {query ? (
          <p className="text-sm text-muted-foreground">
            {listings.length} {listings.length === 1 ? "result" : "results"} for &ldquo;{query}
            &rdquo;
          </p>
        ) : null}
      </div>

      {/* Selection state is client-side; the table stays a server component.
          Only admins can delete, so staff never see the tick boxes. */}
      <BulkSelectProvider allIds={isAdmin ? listings.map((l) => l.id) : []}>
      {isAdmin ? <BulkDeleteBar /> : null}
      <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin ? (
                <TableHead className="w-10">
                  <BulkSelectAllCheckbox />
                </TableHead>
              ) : null}
              <TableHead className="w-16">Photo</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Deal Score</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listings.map((listing) => (
              <TableRow key={listing.id}>
                {isAdmin ? (
                  <TableCell>
                    <BulkSelectCheckbox id={listing.id} title={listing.title} />
                  </TableCell>
                ) : null}
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
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {listing.publishedAt ? (
                    DATE_FORMAT.format(listing.publishedAt)
                  ) : (
                    <span className="text-muted-foreground/60">Not published</span>
                  )}
                </TableCell>
                <TableCell>{formatCents(listing.priceCents)}</TableCell>
                <TableCell>{listing.dealScore}</TableCell>
                <TableCell>
                  <StockInput
                    listingId={listing.id}
                    initialQty={listing.inventoryQty}
                    title={listing.title}
                  />
                </TableCell>
                <TableCell>
                  {/* Opens in a new tab so the admin doesn't lose their place
                      in the list. Drafts are visible here to admin/staff only. */}
                  {/* One flex row, so the trash icon sits beside the status
                      buttons instead of wrapping onto its own line. */}
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Edit works at every status, published included — a
                        saved change goes live on the next request. */}
                    <Link
                      href={`/admin/listings/${listing.id}/edit`}
                      className="text-sm font-medium text-navy-800 hover:underline"
                    >
                      Edit
                    </Link>
                    <span aria-hidden className="text-muted-foreground/50">·</span>
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
                <TableCell
                  colSpan={isAdmin ? 10 : 9}
                  className="py-8 text-center text-muted-foreground"
                >
                  {query ? `No listings match “${query}”.` : "No listings yet."}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      </BulkSelectProvider>
    </div>
  );
}
