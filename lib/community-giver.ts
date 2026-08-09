import { prisma } from "@/lib/prisma";

// "Sellers or users who donate items or fulfill Help Board requests earn a
// visible Community Giver badge" — scoped to what's cleanly attributable
// today: any Help Board contribution (Sponsor a Need or Round Up for
// Good). Item donations aren't separately tracked per-donor yet (fundraiser
// listings don't record who physically donated the item), so that half of
// the brief's definition isn't included here.
export async function isCommunityGiver(userId: string): Promise<boolean> {
  const count = await prisma.helpBoardContribution.count({
    where: { contributorUserId: userId },
  });
  return count > 0;
}
