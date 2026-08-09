import { NextResponse } from "next/server";

import { recalculateAllSellerBadges } from "@/lib/seller-badges";

// Weekly trigger for seller trust badge recalculation (see lib/seller-badges.ts).
// Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically when
// CRON_SECRET is set as an env var — see vercel.json for the schedule. Until
// deployed/scheduled, hit this manually (or use the admin "Recalculate now"
// button on an individual seller) to keep badges fresh.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await recalculateAllSellerBadges();
  return NextResponse.json({ ok: true, ...result });
}
