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
import { PartnerForm } from "./partner-form";
import { PartnerStatusButtons, PartnerContactLink } from "./partner-actions";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Nonprofit partners",
};

export const dynamic = "force-dynamic";

export default async function AdminPartnersPage() {
  await requireAdmin();

  const partners = await prisma.nonprofitPartner.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      contactUser: { select: { name: true, email: true } },
      _count: { select: { needs: true } },
    },
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-heading font-semibold">Nonprofit partners</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Approved partners can post their own Help Board needs directly at{" "}
        <code>/partner</code>, once linked to a user account.
      </p>

      <div className="mb-6 overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Needs posted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partners.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell className="font-medium">{partner.name}</TableCell>
                <TableCell>{partner.status}</TableCell>
                <TableCell>
                  <PartnerContactLink partnerId={partner.id} contact={partner.contactUser} />
                </TableCell>
                <TableCell>{partner._count.needs}</TableCell>
                <TableCell className="text-right">
                  <PartnerStatusButtons partnerId={partner.id} status={partner.status} />
                </TableCell>
              </TableRow>
            ))}
            {partners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No partner organizations yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className="max-w-sm rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="mb-3 font-medium">Add partner</h2>
        <PartnerForm />
      </div>
    </div>
  );
}
