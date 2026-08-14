import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

// Optimistic-only: reads the session from the JWT cookie, no DB access here.
// Real authorization (including the admin-role check) happens in the DAL
// (lib/auth/dal.ts) and inside every Server Action — this just avoids a
// flash of protected UI / redirects obviously-unauthenticated requests early.
const PROTECTED_PREFIXES = ["/checkout", "/account", "/admin"];
const AUTH_ROUTES = ["/login", "/signup"];

// Share-to-earn attribution. Capturing the ?ref= code here (rather than in a
// page) means it survives the whole journey — browse, sign in, cart, checkout
// — without every route having to thread it through.
const SHARE_REF_COOKIE = "ezbz_ref";
const SHARE_REF_PARAM = "ref";
// No expiry on share attribution — 400 days is simply the longest max-age
// Chrome honours, so it stands in for "doesn't expire".
const ATTRIBUTION_WINDOW_SECONDS = 400 * 24 * 60 * 60;

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    nextUrl.pathname.startsWith(prefix)
  );
  const isAuthRoute = AUTH_ROUTES.some((prefix) => nextUrl.pathname.startsWith(prefix));

  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/", nextUrl.origin));
  }

  const response = NextResponse.next();

  // Last-touch attribution: a newer share link overwrites an older one.
  const refCode = nextUrl.searchParams.get(SHARE_REF_PARAM);
  if (refCode) {
    response.cookies.set(SHARE_REF_COOKIE, refCode, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ATTRIBUTION_WINDOW_SECONDS,
    });
  }

  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
