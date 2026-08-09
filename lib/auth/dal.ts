import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

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

export const requireAdmin = cache(async () => {
  const session = await verifySession();
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }
  return session;
});
