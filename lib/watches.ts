import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/auth/dal";

/**
 * Listing ids the current viewer has saved, fetched once per request.
 *
 * Every card in a grid needs to know whether its heart should be filled. Asking
 * per card would be one query each — twenty on the browse page. React's
 * cache() dedupes this to a single query per request, and every card does a
 * Set lookup instead. Signed-out viewers get an empty set with no query.
 */
export const getViewerWatchedIds = cache(async (): Promise<Set<string>> => {
  const session = await getOptionalSession();
  const userId = session?.user?.id;
  if (!userId) return new Set();

  const rows = await prisma.watch.findMany({
    where: { userId },
    select: { listingId: true },
  });
  return new Set(rows.map((r) => r.listingId));
});
