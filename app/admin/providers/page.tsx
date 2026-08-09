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
import { ProviderStatusActions } from "./status-actions";

export const metadata: Metadata = {
  title: "Service providers",
};

export const dynamic = "force-dynamic";

const BACKGROUND_CHECK_LABELS: Record<string, string> = {
  NOT_STARTED: "Not started",
  PENDING: "In review",
  CLEAR: "Clear",
  CONSIDER: "Needs review",
  FAILED: "Failed",
};

export default async function AdminProvidersPage() {
  const providers = await prisma.serviceProvider.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      category: { select: { name: true } },
      subscriptions: { where: { status: "ACTIVE" }, orderBy: { endsAt: "desc" }, take: 1 },
    },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-heading font-semibold">Service providers</h1>
      <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Identity</TableHead>
              <TableHead>Background check</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((provider) => {
              const activeSub = provider.subscriptions[0];
              return (
                <TableRow key={provider.id}>
                  <TableCell className="font-medium">{provider.businessName}</TableCell>
                  <TableCell>{provider.user.name ?? provider.user.email}</TableCell>
                  <TableCell>{provider.category.name}</TableCell>
                  <TableCell>{provider.status}</TableCell>
                  <TableCell>{provider.identityVerifiedAt ? "Verified" : "Unverified"}</TableCell>
                  <TableCell>{BACKGROUND_CHECK_LABELS[provider.backgroundCheckStatus]}</TableCell>
                  <TableCell>
                    {activeSub && activeSub.endsAt > new Date()
                      ? `Active to ${activeSub.endsAt.toLocaleDateString()}`
                      : "None"}
                  </TableCell>
                  <TableCell>
                    <ProviderStatusActions providerId={provider.id} status={provider.status} />
                  </TableCell>
                </TableRow>
              );
            })}
            {providers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No provider applications yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
