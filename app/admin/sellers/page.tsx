import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SellerTrustBadges } from "@/components/seller-trust-badges";
import { SellerStatusActions } from "./status-actions";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Sellers",
};

export const dynamic = "force-dynamic";

export default async function AdminSellersPage() {
  await requireAdmin();

  const sellers = await prisma.seller.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } }, listings: true },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-heading font-semibold">Sellers</h1>
      <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shop name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Badge</TableHead>
              <TableHead>Payouts</TableHead>
              <TableHead>Identity</TableHead>
              <TableHead>Listings</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sellers.map((seller) => (
              <TableRow key={seller.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/sellers/${seller.id}`} className="hover:underline">
                    {seller.displayName}
                  </Link>
                </TableCell>
                <TableCell>{seller.user.name ?? seller.user.email}</TableCell>
                <TableCell>
                  {[seller.city, seller.region].filter(Boolean).join(", ") || "—"}
                </TableCell>
                <TableCell>{seller.status}</TableCell>
                <TableCell>
                  <SellerTrustBadges
                    badgeTier={seller.badgeTier}
                    identityVerified={seller.stripeOnboardingComplete}
                  />
                </TableCell>
                <TableCell>{seller.stripeOnboardingComplete ? "Connected" : "Not connected"}</TableCell>
                <TableCell>{seller.identityVerifiedAt ? "Verified" : "Unverified"}</TableCell>
                <TableCell>{seller.listings.length}</TableCell>
                <TableCell>
                  <SellerStatusActions sellerId={seller.id} status={seller.status} />
                </TableCell>
              </TableRow>
            ))}
            {sellers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  No seller applications yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
