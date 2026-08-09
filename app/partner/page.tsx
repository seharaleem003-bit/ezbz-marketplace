import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { formatCents } from "@/lib/format";
import { Progress } from "@/components/ui/progress";
import { PartnerNeedForm } from "./need-form";

export const metadata: Metadata = {
  title: "Partner dashboard",
};

export const dynamic = "force-dynamic";

export default async function PartnerDashboardPage() {
  const session = await verifySession();

  const partner = await prisma.nonprofitPartner.findUnique({
    where: { contactUserId: session.user.id },
    include: { needs: { orderBy: { createdAt: "desc" } } },
  });

  if (!partner) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-heading font-semibold">Partner dashboard</h1>
        <p className="text-muted-foreground">
          Your account isn&apos;t linked to a nonprofit partner organization yet. Contact EZBZ
          to get your organization set up on the Help Board.
        </p>
      </div>
    );
  }

  if (partner.status !== "APPROVED") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-heading font-semibold">{partner.name}</h1>
        <p className="text-muted-foreground">
          Your organization is {partner.status === "PENDING" ? "pending approval" : "suspended"}{" "}
          — needs can&apos;t be posted until EZBZ approves your partner status.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-heading font-semibold">{partner.name}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Post needs directly to the Help Board on behalf of your organization.
      </p>

      <div className="mb-8">
        <PartnerNeedForm />
      </div>

      <h2 className="mb-3 font-medium">Your needs</h2>
      {partner.needs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No needs posted yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {partner.needs.map((need) => {
            const progress = Math.min(100, Math.round((need.raisedCents / need.goalCents) * 100));
            return (
              <div key={need.id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium">{need.title}</h3>
                  <span className="text-xs text-muted-foreground">{need.status}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{need.description}</p>
                <div className="mt-3">
                  <Progress value={progress} />
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>
                      {formatCents(need.raisedCents)} raised of {formatCents(need.goalCents)}
                    </span>
                    <span>{progress}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
