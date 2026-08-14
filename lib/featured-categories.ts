// The categories promoted in the header strip and the homepage tiles. Drop a
// real photo path into `imageUrl` (e.g. "/uploads/categories/pets.jpg") and the
// tile swaps from the branded icon treatment to that image automatically.
export interface FeaturedCategory {
  label: string;
  slug: string;
  href: string;
  blurb: string;
  imageUrl?: string;
}

export const FEATURED_CATEGORIES: FeaturedCategory[] = [
  {
    label: "Pet",
    slug: "pets",
    href: "/listings?category=pets",
    blurb: "Beds, crates, toys & supplies",
  },
  {
    label: "Home",
    slug: "home-kitchen",
    href: "/listings?category=home-kitchen",
    blurb: "Furniture, kitchen & decor",
  },
  {
    label: "Mobility",
    slug: "mobility",
    href: "/listings?category=mobility",
    blurb: "E-bikes, scooters & personal transport",
  },
  {
    label: "Electronics",
    slug: "electronics",
    href: "/listings?category=electronics",
    blurb: "Audio, smart home & gadgets",
  },
];
