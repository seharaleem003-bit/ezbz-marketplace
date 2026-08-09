import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

// Optimistic-only: reads the session from the JWT cookie, no DB access here.
// Real authorization (including the admin-role check) happens in the DAL
// (lib/auth/dal.ts) and inside every Server Action — this just avoids a
// flash of protected UI / redirects obviously-unauthenticated requests early.
const PROTECTED_PREFIXES = ["/checkout", "/account", "/admin"];
const AUTH_ROUTES = ["/login", "/signup"];

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

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
