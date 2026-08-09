import Link from "next/link";
import QRCode from "qrcode";
import { Heart, Search, ShoppingCart } from "lucide-react";

import { auth } from "@/lib/auth";
import { getCartItemCount } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/auth-dialog";
import { GetAppDialog } from "@/components/get-app-dialog";
import { UserMenu } from "@/components/user-menu";

export async function SiteHeader() {
  const [session, cartCount] = await Promise.all([auth(), getCartItemCount()]);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const qrCodeDataUrl = await QRCode.toDataURL(appUrl, {
    margin: 1,
    width: 320,
    color: { dark: "#0a1930", light: "#ffffff" },
  });

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="text-lg font-heading font-semibold tracking-tight">
          EZ<span className="text-gold-500">BZ</span>
        </Link>

        <form
          action="/listings"
          className="hidden max-w-sm flex-1 items-center sm:flex"
        >
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              placeholder="Search products…"
              aria-label="Search products"
              className="h-9 w-full rounded-full border border-border bg-muted/50 pl-9 pr-3 text-sm outline-none focus:border-gold-500 focus:bg-background"
            />
          </div>
        </form>

        <nav className="hidden items-center gap-6 text-sm font-medium lg:flex">
          <Link href="/listings" className="text-muted-foreground hover:text-foreground">
            Browse deals
          </Link>
          <Link
            href="/listings?sort=deal-score-desc"
            className="text-muted-foreground hover:text-foreground"
          >
            Best Deal Scores
          </Link>
          <Link href="/help-board" className="text-muted-foreground hover:text-foreground">
            Help Board
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <GetAppDialog qrCodeDataUrl={qrCodeDataUrl} />
          <Button
            variant="ghost"
            size="icon"
            render={<Link href="/wishlist" aria-label="Wishlist" />}
          >
            <Heart />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            render={<Link href="/cart" aria-label="Cart" />}
          >
            <ShoppingCart />
            {cartCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-gold-500 text-[10px] font-bold text-navy-900">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            ) : null}
          </Button>
          {session?.user ? (
            <UserMenu
              name={session.user.name}
              email={session.user.email}
              isAdmin={session.user.role === "ADMIN"}
            />
          ) : (
            <AuthDialog />
          )}
        </div>
      </div>
    </header>
  );
}
