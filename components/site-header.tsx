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
import { categoryName } from "@/lib/i18n/content";
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

/**
 * The storefront search box.
 *
 * A plain GET form, so it works before hydration and on a slow phone. One
 * text input means Enter submits it without a button, and enterKeyHint turns
 * the phone keyboard's return key into "Search" so there is something obvious
 * to press.
 */
function SearchField({ placeholder, label }: { placeholder: string; label: string }) {
  return (
    <form action="/listings" role="search" className="flex w-full min-w-0 items-center">
      <div className="relative w-full">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          name="q"
          enterKeyHint="search"
          autoComplete="off"
          placeholder={placeholder}
          aria-label={label}
          className="h-10 w-full rounded-full border border-border bg-muted/50 pl-9 pr-3 text-base outline-none focus:border-gold-500 focus:bg-background sm:text-sm"
        />
      </div>
    </form>
  );
}

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

  // Tree for the department menu. Categories with nothing published under
  // them are left out: every entry here is a promise that there is something
  // to look at, and "Cat food" leading to an empty page breaks that.
  const [allCategories, stocked] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true, nameEs: true, parentId: true },
    }),
    prisma.listing.groupBy({
      by: ["categoryId"],
      where: { status: "PUBLISHED" },
      _count: true,
    }),
  ]);

  const direct = new Set(stocked.filter((s) => s._count > 0).map((s) => s.categoryId));
  const inStock = new Set<string>();
  for (const category of allCategories) {
    if (!direct.has(category.id)) continue;
    let node: (typeof allCategories)[number] | undefined = category;
    while (node && !inStock.has(node.id)) {
      inStock.add(node.id);
      node = allCategories.find((c) => c.id === node!.parentId);
    }
  }

  const departments = allCategories
    .filter((c) => c.parentId === null && inStock.has(c.id))
    .map((parent) => ({
      ...parent,
      name: categoryName(parent, locale),
      children: allCategories
        .filter((c) => c.parentId === parent.id && inStock.has(c.id))
        .map(({ id, slug, name, nameEs }) => ({ id, slug, name: categoryName({ name, nameEs }, locale) })),
    }));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  // Points at /install so scanning lands on the page that offers to install,
  // rather than the homepage where the visitor has to find the button again.
  const qrCodeDataUrl = await QRCode.toDataURL(`${appUrl}/install`, {
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
      {/* h-16 only from sm up: on phones the row sizes to its contents so the
          search row below it isn't pushed off the sticky header. */}
      <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-4 py-2 sm:gap-4 sm:py-0">
        {/* The full lockup, matching the app icon and launch screen. MALL is
            set as text rather than baked into the image so it stays crisp at
            any size and keeps its own colour. */}
        <Link
          href="/"
          aria-label={dict.header.home}
          className="flex shrink-0 flex-col items-stretch"
        >
          <Image
            src="/logo.png"
            alt="EZBZ MALL"
            width={1378}
            height={554}
            priority
            className="h-7 w-auto sm:h-8"
          />
          <span className="mt-0.5 flex items-center gap-1.5">
            <span className="h-px flex-1 bg-gold-500/50" />
            <span className="text-[9px] font-bold leading-none tracking-[0.3em] text-gold-600 sm:text-[10px]">
              MALL
            </span>
            <span className="h-px flex-1 bg-gold-500/50" />
          </span>
        </Link>

        {/* Phones get the search bar on its own row below — see after this
            div. Sharing one row with the logo and the icons squeezed it to a
            sliver that the app button then overlapped, so it couldn't be
            typed into at all. */}
        <div className="hidden min-w-0 flex-1 sm:flex">
          <SearchField
            placeholder={dict.header.searchPlaceholder}
            label={dict.header.searchLabel}
          />
        </div>

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
          {/* Shown at every size — it shortens to "App" on phones rather than
              dropping out, since it is the main install prompt. */}
          <GetAppDialog
            qrCodeDataUrl={qrCodeDataUrl}
            label={dict.header.getTheApp}
            shortLabel={dict.header.getTheAppShort}
          />
          {/* Kept at every size. It is an icon button, so it costs the phone
              row about as much as the cart, and someone who needs the site in
              Spanish needs it on their phone most of all. */}
          <LanguageSwitcher current={locale} label={dict.header.language} />
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:inline-flex"
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

      {/* Phone-only search row, full width so it can actually be typed into. */}
      <div className="px-4 pb-2 sm:hidden">
        <SearchField
          placeholder={dict.header.searchPlaceholder}
          label={dict.header.searchLabel}
        />
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

          {/* Start selling lives here on phones. The white row above is full,
              but this bar has the space, and burying the seller entry point
              in the footer hides it from exactly the people it is for. */}
          {canSell ? (
            <Link
              href="/sell"
              className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-gold-400 hover:text-gold-300 sm:hidden"
            >
              <Store className="size-4" />
              {dict.header.startSelling}
            </Link>
          ) : (
            <span
              title={dict.header.sellingComingSoonHint}
              className="ml-auto flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-white/60 sm:hidden"
            >
              <Store className="size-4" />
              {dict.header.startSelling}
              <span className="rounded-full bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-navy-900">
                {dict.header.comingSoon}
              </span>
            </span>
          )}
        </div>
      </nav>
    </header>
  );
}
