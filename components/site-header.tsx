import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import {
  Bike,
  Heart,
  House,
  PawPrint,
  Search,
  ShoppingCart,
  Smartphone,
  Store,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { getCartItemCount } from "@/lib/cart";
import { FEATURED_CATEGORIES } from "@/lib/featured-categories";
import { getDictionary, getLocale } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/auth-dialog";
import { GetAppDialog } from "@/components/get-app-dialog";
import { UserMenu } from "@/components/user-menu";

const CATEGORY_ICONS: Record<string, typeof PawPrint> = {
  pets: PawPrint,
  "home-kitchen": House,
  mobility: Bike,
  electronics: Smartphone,
};

// The featured categories are branded nav entries, not raw category names, so
// their labels live in the dictionary rather than coming from the database.
const CATEGORY_LABEL_KEYS: Record<string, "pet" | "home" | "mobility" | "electronics"> = {
  pets: "pet",
  "home-kitchen": "home",
  mobility: "mobility",
  electronics: "electronics",
};

export async function SiteHeader() {
  const [session, cartCount, locale] = await Promise.all([
    auth(),
    getCartItemCount(),
    getLocale(),
  ]);
  const dict = await getDictionary();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const qrCodeDataUrl = await QRCode.toDataURL(appUrl, {
    margin: 1,
    width: 320,
    color: { dark: "#0a1930", light: "#ffffff" },
  });

  return (
    // transform-gpu + isolate force this into its own compositing layer.
    // A sticky element using backdrop-blur otherwise smears in Chromium when
    // something nearby animates a transform (the hero carousel), leaving a
    // ghost of the previous frame painted behind the page.
    <header className="sticky top-0 z-40 isolate transform-gpu border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" aria-label={dict.header.home} className="shrink-0">
          <Image
            src="/logo.png"
            alt="EZBZ"
            width={1378}
            height={554}
            priority
            className="h-8 w-auto"
          />
        </Link>

        <form action="/listings" className="flex min-w-0 flex-1 items-center">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              placeholder={dict.header.searchPlaceholder}
              aria-label={dict.header.searchLabel}
              className="h-10 w-full rounded-full border border-border bg-muted/50 pl-9 pr-3 text-sm outline-none focus:border-gold-500 focus:bg-background"
            />
          </div>
        </form>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="hidden rounded-full border-navy-800/25 font-semibold text-navy-800 hover:bg-navy-800/5 sm:inline-flex"
            render={<Link href="/sell" />}
          >
            <Store />
            {dict.header.startSelling}
          </Button>
          <GetAppDialog qrCodeDataUrl={qrCodeDataUrl} label={dict.header.getTheApp} />
          <LanguageSwitcher current={locale} label={dict.header.language} />
          <Button
            variant="ghost"
            size="icon"
            render={<Link href="/wishlist" aria-label={dict.header.wishlist} />}
          >
            <Heart />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            render={<Link href="/cart" aria-label={dict.header.cart} />}
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

      <nav className="border-t">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
          {FEATURED_CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category.slug] ?? PawPrint;
            const labelKey = CATEGORY_LABEL_KEYS[category.slug];
            return (
              <Button
                key={category.slug}
                variant="outline"
                size="sm"
                className="rounded-full border-navy-800/25 font-semibold text-navy-800 hover:border-gold-500 hover:bg-gold-500/10 hover:text-navy-900"
                render={<Link href={category.href} />}
              >
                <Icon />
                {labelKey ? dict.categories[labelKey] : category.label}
              </Button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
