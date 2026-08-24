import "server-only";

import { prisma } from "@/lib/prisma";
import { collectCategoryIds, type CategoryNode } from "@/lib/listings";

/**
 * A single promo panel in the hero row — a coloured marketing tile with a
 * headline and product imagery, in the style of Amazon's homepage row.
 *
 * `imageUrls` drives the collage: one photo fills the tile, two or more are
 * tiled in a grid.
 */
export interface HeroTile {
  id: string;
  kicker: string;
  headline: string;
  /** Optional smaller line under the headline. */
  sub?: string;
  ctaLabel: string;
  href: string;
  /** Tailwind classes for the tile background. */
  background: string;
  /** Tailwind class for the tile's text colour. */
  text: string;
  imageUrls: string[];
  /** Set on product spotlights — rendered as a price chip over the photo. */
  price?: string;
}

/**
 * Departments given a product spotlight in the hero row, in display order.
 *
 * One tile each, so the row shows six different corners of the catalogue
 * rather than six variations on whatever happens to be newest.
 */
const SPOTLIGHT_DEPARTMENTS: { slug: string; background: string; text: string }[] = [
  { slug: "pets", background: "bg-[#5b8c5a]", text: "text-white" },
  { slug: "home-kitchen", background: "bg-[#f4a259]", text: "text-navy-900" },
  { slug: "tools-hardware", background: "bg-[#8c4a2f]", text: "text-white" },
  { slug: "beauty-personal-care", background: "bg-[#7b4b94]", text: "text-white" },
  { slug: "baby-kids", background: "bg-[#d4e94a]", text: "text-navy-900" },
  { slug: "mobility", background: "bg-gold-500", text: "text-navy-900" },
];

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Long supplier titles overflow the tile headline, so cut on a word boundary. */
function shorten(title: string, max = 46) {
  if (title.length <= max) return title;
  const cut = title.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * One product spotlight per department, each a different listing.
 *
 * Departments roll up their subcategories, so "Pets" can be represented by a
 * playpen filed three levels down.
 */
async function spotlightTiles(tree: CategoryNode[]): Promise<HeroTile[]> {
  const used = new Set<string>();
  const tiles: HeroTile[] = [];

  for (const dept of SPOTLIGHT_DEPARTMENTS) {
    const ids = collectCategoryIds(tree, dept.slug);
    if (ids.length === 0) continue;
    const deptName = tree.find((c) => c.slug === dept.slug)?.name ?? "";

    const listing = await prisma.listing.findFirst({
      where: {
        status: "PUBLISHED",
        categoryId: { in: ids },
        id: { notIn: [...used] },
        photos: { some: {} },
      },
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true } },
        photos: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    });
    if (!listing) continue;

    used.add(listing.id);
    tiles.push({
      id: `spotlight-${dept.slug}`,
      // The department, not the leaf — a tile labelled "Metal" (from
      // Pets > Dog play pens > Metal) means nothing on its own.
      kicker: deptName,
      headline: shorten(listing.title),
      ctaLabel: "Shop this deal",
      href: `/listings/${listing.slug}`,
      background: dept.background,
      text: dept.text,
      imageUrls: [listing.photos[0].url],
      price: priceFormatter.format(listing.priceCents / 100),
    });
  }

  return tiles;
}

async function photosFor(where: Parameters<typeof prisma.listing.findMany>[0], take: number) {
  const listings = await prisma.listing.findMany({
    ...where,
    take,
    include: { photos: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  return listings.map((l) => l.photos[0]?.url).filter((u): u is string => Boolean(u));
}

/**
 * Builds the hero row from live catalogue data, so the imagery is always real
 * inventory rather than stock art that goes stale.
 */
export async function getHeroTiles(): Promise<HeroTile[]> {
  const tree = await prisma.category.findMany({
    select: { id: true, slug: true, name: true, parentId: true, sortOrder: true },
  });

  // Category collages roll up their subcategories too — with the real
  // catalogue filed under nodes like "Pets > Dog play pens > Acrylic", an
  // exact slug match on the parent returns nothing.
  const inTree = (slug: string) => ({
    status: "PUBLISHED" as const,
    categoryId: { in: collectCategoryIds(tree, slug) },
  });

  const [spotlights, prebookPhotos, dealPhotos, petPhotos, homePhotos, toolsPhotos, newestPhotos] =
    await Promise.all([
      spotlightTiles(tree),
      photosFor({ where: { status: "PUBLISHED", isPrebook: true } }, 4),
      photosFor(
        { where: { status: "PUBLISHED", isPrebook: false }, orderBy: { dealScore: "desc" } },
        4
      ),
      photosFor({ where: inTree("pets") }, 4),
      photosFor({ where: inTree("home-kitchen") }, 4),
      photosFor({ where: inTree("tools-hardware") }, 4),
      photosFor({ where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" } }, 4),
    ]);

  const tiles: HeroTile[] = [
    {
      id: "free-shipping",
      kicker: "Get free delivery on your order",
      headline: "Free shipping over $200",
      ctaLabel: "Start shopping",
      href: "/listings",
      background: "bg-[#1a56db]",
      text: "text-white",
      imageUrls: dealPhotos.slice(0, 4),
    },

    // Six real products, one per department, ahead of the generic promos.
    ...spotlights,

    {
      id: "prebook",
      kicker: "Reserve before it lands",
      headline: "Pre-book & save 10%",
      sub: "Delivery 30–35 days",
      ctaLabel: "Shop pre-book",
      href: "/listings?prebook=1",
      background: "bg-navy-900",
      text: "text-white",
      imageUrls: prebookPhotos.slice(0, 4),
    },
    {
      id: "top-deals",
      kicker: "Verified by Deal Score™",
      headline: "Today's biggest savings",
      sub: "Up to 79% off retail",
      ctaLabel: "See all deals",
      href: "/listings?sort=deal-score-desc",
      background: "bg-[#d4e94a]",
      text: "text-navy-900",
      imageUrls: dealPhotos.slice(0, 4),
    },
    {
      id: "home",
      kicker: "Furniture, kitchen & decor",
      headline: "Everything for the home",
      ctaLabel: "Shop home",
      href: "/listings?category=home-kitchen",
      background: "bg-[#f4a259]",
      text: "text-navy-900",
      imageUrls: homePhotos.slice(0, 4),
    },
    {
      id: "pets",
      kicker: "Beds, crates, toys & supplies",
      headline: "Treat your pet",
      ctaLabel: "Shop pets",
      href: "/listings?category=pets",
      background: "bg-[#5b8c5a]",
      text: "text-white",
      imageUrls: petPhotos.slice(0, 4),
    },
    {
      id: "tools",
      kicker: "Drills, hand tools & liquidation lots",
      headline: "Kit out the workshop",
      ctaLabel: "Shop tools",
      href: "/listings?category=tools-hardware",
      background: "bg-[#8c4a2f]",
      text: "text-white",
      imageUrls: toolsPhotos.slice(0, 4),
    },
    {
      id: "share-earn",
      kicker: "Share any listing you like",
      headline: "Earn 2% store credit",
      sub: "Paid when someone buys through your link",
      ctaLabel: "How it works",
      href: "/account/referrals",
      background: "bg-[#1a56db]",
      text: "text-white",
      imageUrls: newestPhotos.slice(0, 4),
    },
  ];

  // A tile with no imagery looks broken next to full ones — drop empty
  // categories rather than shipping a blank panel.
  return tiles.filter((tile) => tile.imageUrls.length > 0 || tile.id === "free-shipping");
}
