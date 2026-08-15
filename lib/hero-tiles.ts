import "server-only";

import { prisma } from "@/lib/prisma";

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
  const [
    prebookPhotos,
    dealPhotos,
    petPhotos,
    homePhotos,
    mobilityPhotos,
    electronicsPhotos,
    toolsPhotos,
    fitnessPhotos,
    newestPhotos,
  ] = await Promise.all([
    photosFor({ where: { status: "PUBLISHED", isPrebook: true } }, 4),
    photosFor(
      { where: { status: "PUBLISHED", isPrebook: false }, orderBy: { dealScore: "desc" } },
      4
    ),
    photosFor({ where: { status: "PUBLISHED", category: { slug: "pets" } } }, 4),
    photosFor({ where: { status: "PUBLISHED", category: { slug: "home-kitchen" } } }, 4),
    photosFor({ where: { status: "PUBLISHED", category: { slug: "mobility" } } }, 4),
    photosFor({ where: { status: "PUBLISHED", category: { slug: "electronics" } } }, 4),
    photosFor({ where: { status: "PUBLISHED", category: { slug: "tools-hardware" } } }, 4),
    photosFor({ where: { status: "PUBLISHED", category: { slug: "fitness-outdoors" } } }, 4),
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
      id: "electronics",
      kicker: "Audio, smart home & gadgets",
      headline: "Tech worth switching to",
      ctaLabel: "Shop electronics",
      href: "/listings?category=electronics",
      background: "bg-navy-800",
      text: "text-white",
      imageUrls: electronicsPhotos.slice(0, 4),
    },
    {
      id: "mobility",
      kicker: "E-bikes, scooters & more",
      headline: "Get moving for less",
      ctaLabel: "Shop mobility",
      href: "/listings?category=mobility",
      background: "bg-gold-500",
      text: "text-navy-900",
      imageUrls: mobilityPhotos.slice(0, 4),
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
      id: "fitness",
      kicker: "Weights, tents & the outdoors",
      headline: "Gear up for less",
      ctaLabel: "Shop fitness",
      href: "/listings?category=fitness-outdoors",
      background: "bg-[#2f6f6b]",
      text: "text-white",
      imageUrls: fitnessPhotos.slice(0, 4),
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
