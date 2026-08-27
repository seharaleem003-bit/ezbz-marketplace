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
import { prisma } from "@/lib/prisma";
import { FEATURED_CATEGORIES } from "@/lib/featured-categories";
import { SELLER_SIGNUP_OPEN } from "@/lib/feature-flags";
import { DepartmentMenu } from "@/components/department-menu";
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

  // Sellers already approved keep working access while signups are parked;
  // for everyone else the button is disabled and badged "coming soon".
  const sellerId = session?.user?.id;
  const canSell =
    SELLER_SIGNUP_OPEN ||
    (sellerId
      ? Boolean(
          await prisma.seller.findFirst({
            where: { userId: sellerId, status: "APPROVED" },
            select: { id: true },
          })
        )
      : false);

  // Full tree for the department menu — top-level entries with their children.
  const allCategories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true, parentId: true },
  });
  const departments = allCategories
    .filter((c) => c.parentId === null)
    .map((parent) => ({
      ...parent,
      children: allCategories
        .filter((c) => c.parentId === parent.id)
        .map(({ id, slug, name }) => ({ id, slug, name })),
    }));
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
          {canSell ? (
            <Button
              variant="outline"
              size="sm"
              className="hidden rounded-full border-navy-800/25 font-semibold text-navy-800 hover:bg-navy-800/5 sm:inline-flex"
              render={<Link href="/sell" />}
            >
              <Store />
              {dict.header.startSelling}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled
              title={dict.header.sellingComingSoonHint}
              className="hidden rounded-full border-navy-800/25 font-semibold text-navy-800 opacity-100 disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex"
            >
              <Store />
              {dict.header.startSelling}
              <span className="ml-1 rounded-full bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-navy-900">
                {dict.header.comingSoon}
              </span>
            </Button>
          )}
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

      {/* Department bar. Navy so it reads as part of the header rather than
          floating chips on white, and anchored by the full category menu. */}
      <nav className="relative bg-navy-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-1.5">
          <DepartmentMenu
            departments={departments}
            label={dict.header.allDepartments}
            allLabel={dict.header.shopAll}
          />

          <span className="mx-1 h-5 w-px bg-white/20" aria-hidden />

          {FEATURED_CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category.slug] ?? PawPrint;
            const labelKey = CATEGORY_LABEL_KEYS[category.slug];
            return (
              <Link
                key={category.slug}
                href={category.href}
                className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white sm:flex"
              >
                <Icon className="size-4" />
                {labelKey ? dict.categories[labelKey] : category.label}
              </Link>
            );
          })}

          <Link
            href="/listings?sort=deal-score-desc"
            className="hidden rounded-md px-2.5 py-1.5 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white lg:block"
          >
            {dict.footer.bestDealScores}
          </Link>
          <Link
            href="/listings?prebook=1"
            className="hidden rounded-md px-2.5 py-1.5 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white lg:block"
          >
            {dict.home.prebookBadge}
          </Link>

          {/* Pushed right — a standing reminder of the shipping threshold. */}
          <Link
            href="/listings"
            className="ml-auto hidden text-sm font-semibold text-gold-400 hover:text-gold-300 md:block"
          >
            {dict.header.freeShippingNote}
          </Link>
        </div>
      </nav>
    </header>
  );
}
