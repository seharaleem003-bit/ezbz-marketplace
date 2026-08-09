import "dotenv/config";
import bcrypt from "bcryptjs";
import { ListingCondition } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { computeDealScore } from "../lib/deal-score";

const CATEGORIES = [
  { name: "Electronics", slug: "electronics" },
  { name: "Home & Kitchen", slug: "home-kitchen" },
  { name: "Tools & Hardware", slug: "tools-hardware" },
  { name: "Fitness & Outdoors", slug: "fitness-outdoors" },
  { name: "Furniture", slug: "furniture" },
];

const SAMPLE_VIDEO_URL =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

type SeedListing = {
  slug: string;
  title: string;
  description: string;
  categorySlug: string;
  condition: ListingCondition;
  priceCents: number;
  retailPriceCents?: number;
  amazonPriceCents?: number;
  amazonUrl?: string;
  inventoryQty: number;
  photoSeeds: string[];
  hasVideo?: boolean;
};

const LISTINGS: SeedListing[] = [
  {
    slug: "liquidation-pallet-smart-home-gadgets",
    title: "Liquidation Pallet — Smart Home Gadgets (12 units)",
    description:
      "Mixed pallet of overstock smart plugs, bulbs, and sensors from a big-box return center. Units are untested individually but visually inspected — see the video walkaround for pallet condition.",
    categorySlug: "electronics",
    condition: ListingCondition.SALVAGE,
    priceCents: 8900,
    retailPriceCents: 42000,
    inventoryQty: 4,
    photoSeeds: ["pallet-smart-home-1", "pallet-smart-home-2"],
    hasVideo: true,
  },
  {
    slug: "noise-cancelling-headphones-open-box",
    title: "Wireless Noise-Cancelling Headphones — Open Box",
    description:
      "Customer return, open box. Includes charging cable and case. Light shelf wear on the headband, otherwise fully functional.",
    categorySlug: "electronics",
    condition: ListingCondition.LIKE_NEW,
    priceCents: 12900,
    retailPriceCents: 24900,
    amazonPriceCents: 22999,
    amazonUrl: "https://www.amazon.com/s?k=wireless+noise+cancelling+headphones",
    inventoryQty: 9,
    photoSeeds: ["headphones-1", "headphones-2"],
  },
  {
    slug: "robot-vacuum-refurbished",
    title: "Robot Vacuum — Manufacturer Refurbished",
    description:
      "Factory refurbished with new filters and brushes. Comes with a 90-day EZBZ warranty. Original retail box not included.",
    categorySlug: "home-kitchen",
    condition: ListingCondition.GOOD,
    priceCents: 15900,
    retailPriceCents: 39900,
    amazonPriceCents: 34900,
    amazonUrl: "https://www.amazon.com/s?k=robot+vacuum",
    inventoryQty: 6,
    photoSeeds: ["robot-vacuum-1", "robot-vacuum-2"],
    hasVideo: true,
  },
  {
    slug: "stand-mixer-scratch-and-dent",
    title: "Stand Mixer — Scratch & Dent",
    description:
      "Cosmetic dent on the base, fully functional motor and attachments included. A great deal if you don't mind a mark that won't show on your counter.",
    categorySlug: "home-kitchen",
    condition: ListingCondition.FAIR,
    priceCents: 17900,
    retailPriceCents: 44900,
    inventoryQty: 3,
    photoSeeds: ["stand-mixer-1"],
  },
  {
    slug: "cordless-drill-driver-combo-kit",
    title: "Cordless Drill/Driver Combo Kit — New",
    description:
      "Brand new, sealed retail packaging. Includes two batteries, charger, and carrying case.",
    categorySlug: "tools-hardware",
    condition: ListingCondition.NEW,
    priceCents: 11900,
    retailPriceCents: 19900,
    amazonPriceCents: 17900,
    amazonUrl: "https://www.amazon.com/s?k=cordless+drill+driver+combo+kit",
    inventoryQty: 14,
    photoSeeds: ["drill-kit-1", "drill-kit-2"],
  },
  {
    slug: "liquidation-lot-hand-tools",
    title: "Liquidation Lot — Assorted Hand Tools (30+ pieces)",
    description:
      "Overstock lot from a hardware store closeout. Mixed brands, mostly new-in-package with a few loose pieces. See video walkaround for the full lot contents.",
    categorySlug: "tools-hardware",
    condition: ListingCondition.GOOD,
    priceCents: 6500,
    retailPriceCents: 28000,
    inventoryQty: 5,
    photoSeeds: ["hand-tools-1", "hand-tools-2"],
    hasVideo: true,
  },
  {
    slug: "adjustable-dumbbell-set-floor-model",
    title: "Adjustable Dumbbell Set — Floor Model",
    description:
      "Gym floor display unit. Full range of motion tested, adjustment dial works smoothly. Minor surface scuffs from display handling.",
    categorySlug: "fitness-outdoors",
    condition: ListingCondition.GOOD,
    priceCents: 14900,
    retailPriceCents: 29900,
    amazonPriceCents: 27900,
    amazonUrl: "https://www.amazon.com/s?k=adjustable+dumbbell+set",
    inventoryQty: 2,
    photoSeeds: ["dumbbells-1"],
  },
  {
    slug: "4-person-camping-tent-new",
    title: "4-Person Camping Tent — New",
    description: "Overstock inventory, brand new in original packaging. Factory seam-sealed.",
    categorySlug: "fitness-outdoors",
    condition: ListingCondition.NEW,
    priceCents: 8900,
    retailPriceCents: 14900,
    inventoryQty: 11,
    photoSeeds: ["tent-1", "tent-2"],
  },
  {
    slug: "leather-office-chair-liquidation",
    title: "Leather Office Chair — Office Liquidation",
    description:
      "From a corporate office downsize. Fully adjustable, minor wear on armrests consistent with light office use.",
    categorySlug: "furniture",
    condition: ListingCondition.GOOD,
    priceCents: 9900,
    retailPriceCents: 32900,
    inventoryQty: 7,
    photoSeeds: ["office-chair-1", "office-chair-2"],
  },
  {
    slug: "3-piece-patio-set-salvage",
    title: "3-Piece Patio Set — Salvage",
    description:
      "Warehouse water damage to original packaging only — furniture itself is structurally sound. Priced accordingly. Sold as-is.",
    categorySlug: "furniture",
    condition: ListingCondition.SALVAGE,
    priceCents: 12900,
    retailPriceCents: 59900,
    inventoryQty: 1,
    photoSeeds: ["patio-set-1"],
    hasVideo: true,
  },
];

async function main() {
  const adminEmail = "admin@ezbz.dev";
  const adminPassword = "ChangeMe123!";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "EZBZ Admin",
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      referralCode: "EZBZADMIN",
    },
  });
  console.log(`Admin user ready: ${admin.email} (password: ${adminPassword})`);

  const categoryBySlug = new Map<string, string>();
  for (const category of CATEGORIES) {
    const created = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
    });
    categoryBySlug.set(category.slug, created.id);
  }

  for (const listing of LISTINGS) {
    const categoryId = categoryBySlug.get(listing.categorySlug);
    if (!categoryId) throw new Error(`Unknown category slug: ${listing.categorySlug}`);

    const dealScore = computeDealScore({
      priceCents: listing.priceCents,
      retailPriceCents: listing.retailPriceCents,
      amazonPriceCents: listing.amazonPriceCents,
      condition: listing.condition,
    });

    const created = await prisma.listing.upsert({
      where: { slug: listing.slug },
      update: {
        title: listing.title,
        description: listing.description,
        categoryId,
        condition: listing.condition,
        status: "PUBLISHED",
        priceCents: listing.priceCents,
        retailPriceCents: listing.retailPriceCents,
        amazonPriceCents: listing.amazonPriceCents,
        amazonUrl: listing.amazonUrl,
        amazonPriceCheckedAt: listing.amazonPriceCents ? new Date() : null,
        inventoryQty: listing.inventoryQty,
        dealScore,
        dealScoreUpdatedAt: new Date(),
      },
      create: {
        slug: listing.slug,
        title: listing.title,
        description: listing.description,
        categoryId,
        condition: listing.condition,
        status: "PUBLISHED",
        priceCents: listing.priceCents,
        retailPriceCents: listing.retailPriceCents,
        amazonPriceCents: listing.amazonPriceCents,
        amazonUrl: listing.amazonUrl,
        amazonPriceCheckedAt: listing.amazonPriceCents ? new Date() : null,
        inventoryQty: listing.inventoryQty,
        dealScore,
        dealScoreUpdatedAt: new Date(),
      },
    });

    await prisma.listingPhoto.deleteMany({ where: { listingId: created.id } });
    await prisma.listingPhoto.createMany({
      data: listing.photoSeeds.map((seed, index) => ({
        listingId: created.id,
        url: `https://picsum.photos/seed/${seed}/1200/900`,
        altText: listing.title,
        sortOrder: index,
      })),
    });

    await prisma.listingVideo.deleteMany({ where: { listingId: created.id } });
    if (listing.hasVideo) {
      await prisma.listingVideo.create({
        data: {
          listingId: created.id,
          url: SAMPLE_VIDEO_URL,
          caption: "Walkaround",
          addedByAdminId: admin.id,
        },
      });
    }

    console.log(`Seeded listing: ${created.title} (Deal Score ${dealScore})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
