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
import { FundraiserStatusActions } from "./status-actions";

export const metadata: Metadata = {
  title: "Fundraisers",
};

export const dynamic = "force-dynamic";

export default async function AdminFundraisersPage() {
  const fundraisers = await prisma.fundraiser.findMany({
    orderBy: { createdAt: "desc" },
    include: { organizer: { select: { name: true, email: true } }, listings: true },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-heading font-semibold">Fundraisers</h1>
      <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Organizer</TableHead>
              <TableHead>Cause</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Listings</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fundraisers.map((fundraiser) => (
              <TableRow key={fundraiser.id}>
                <TableCell className="font-medium">{fundraiser.name}</TableCell>
                <TableCell>{fundraiser.organizer.name ?? fundraiser.organizer.email}</TableCell>
                <TableCell className="max-w-80 truncate">{fundraiser.cause}</TableCell>
                <TableCell>{fundraiser.status}</TableCell>
                <TableCell>{fundraiser.listings.length}</TableCell>
                <TableCell>
                  <FundraiserStatusActions
                    fundraiserId={fundraiser.id}
                    status={fundraiser.status}
                  />
                </TableCell>
              </TableRow>
            ))}
            {fundraisers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No fundraiser applications yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
