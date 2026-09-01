import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NeedForm } from "./need-form";
import { NeedRow } from "./need-row";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Help Board",
};

export const dynamic = "force-dynamic";

export default async function AdminHelpBoardPage() {
  await requireAdmin();

  const [needs, partners] = await Promise.all([
    prisma.helpBoardNeed.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.nonprofitPartner.findMany({
      where: { status: "APPROVED" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-heading font-semibold">Help Board</h1>

      <NeedForm partners={partners} />

      <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Raised / Goal</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {needs.map((need) => (
              <NeedRow key={need.id} need={need} />
            ))}
            {needs.length === 0 ? (
              <TableRow>
                <td colSpan={4} className="py-8 text-center text-muted-foreground">
                  No needs posted yet.
                </td>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
