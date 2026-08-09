import type { Metadata } from "next";
import { HeartHandshake } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/format";
import { getDeliveredNeedsCount } from "@/lib/help-board";
import { Progress } from "@/components/ui/progress";
import { SponsorForm } from "./sponsor-form";

export const metadata: Metadata = {
  title: "Help Board",
};

export const dynamic = "force-dynamic";

export default async function HelpBoardPage() {
  const [needs, deliveredCount] = await Promise.all([
    prisma.helpBoardNeed.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      include: { nonprofitPartner: { select: { name: true } } },
    }),
    getDeliveredNeedsCount(),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="mb-8 rounded-xl bg-navy-900 p-6 text-center text-white">
        <HeartHandshake className="mx-auto mb-2 size-8 text-gold-400" />
        <p className="text-3xl font-heading font-semibold">{deliveredCount}</p>
        <p className="text-sm text-white/70">needs delivered to neighbors so far</p>
      </div>

      <h1 className="mb-2 text-2xl font-heading font-semibold">Help Board</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Chip in toward a neighbor&apos;s need — every contribution goes directly toward
        fulfilling the request below.
      </p>

      {needs.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          No open needs right now — check back soon.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {needs.map((need) => {
            const progress = Math.min(
              100,
              Math.round((need.raisedCents / need.goalCents) * 100)
            );
            return (
              <div key={need.id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-medium">{need.title}</h2>
                    {need.nonprofitPartner ? (
                      <p className="text-xs text-muted-foreground">
                        Posted by {need.nonprofitPartner.name}
                      </p>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{need.description}</p>
                <div className="mt-3">
                  <Progress value={progress} />
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>
                      {formatCents(need.raisedCents)} raised of {formatCents(need.goalCents)}
                    </span>
                    <span>{progress}%</span>
                  </div>
                </div>
                <div className="mt-3">
                  <SponsorForm needId={need.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
