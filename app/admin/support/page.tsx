import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TicketRow } from "./ticket-row";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Support tickets",
};

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  await requireAdmin();

  const tickets = await prisma.supportTicket.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-heading font-semibold">Support tickets</h1>
      <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} />
            ))}
            {tickets.length === 0 ? (
              <TableRow>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  No tickets yet.
                </td>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
