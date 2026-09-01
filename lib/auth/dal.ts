import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Secure check: every Server Action / data request that needs an
// authenticated user should call this (not just rely on proxy.ts, which is
// optimistic-only and cookie-based). cache() dedupes repeated calls within
// a single render/request.
export const verifySession = cache(async () => {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
});

// Like verifySession(), but also usable where you want a non-redirecting
// result (e.g. to decide what to render rather than bounce the request).
export const getOptionalSession = cache(async () => {
  return auth();
});

/**
 * The role as it is *right now*, read from the database.
 *
 * The session is a JWT, so `session.user.role` is a snapshot taken when the
 * user signed in and does not change when their access is revoked — without
 * this, removing someone's access would leave them working normally until
 * their token happened to expire. Every privileged gate below checks this
 * instead. One indexed lookup, on admin routes only.
 */
const currentRole = cache(async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role ?? null;
});

export const requireAdmin = cache(async () => {
  const session = await verifySession();
  if ((await currentRole(session.user.id)) !== "ADMIN") {
    redirect("/");
  }
  return session;
});

/**
 * Admin *or* catalogue staff.
 *
 * Staff can build the catalogue and preview their drafts but nothing else —
 * no orders, customers, payouts, or user management. Every page they can't
 * reach still calls requireAdmin, so adding a new admin page defaults to
 * closed rather than accidentally exposing it.
 */
export const requireCatalogAccess = cache(async () => {
  const session = await verifySession();
  const role = await currentRole(session.user.id);
  if (role !== "ADMIN" && role !== "STAFF") {
    redirect("/");
  }
  // Hand back the live role, so callers gating on STAFF (e.g. the publish
  // restriction) never act on the stale one in the token.
  return { ...session, user: { ...session.user, role } };
});

export const isStaffOnly = (role: string | undefined) => role === "STAFF";
