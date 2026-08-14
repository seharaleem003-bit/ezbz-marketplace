import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bike, House, PawPrint, Smartphone } from "lucide-react";

import { FEATURED_CATEGORIES } from "@/lib/featured-categories";
import { getDictionary } from "@/lib/i18n";

const LABEL_KEYS: Record<string, "pet" | "home" | "mobility" | "electronics"> = {
  pets: "pet",
  "home-kitchen": "home",
  mobility: "mobility",
  electronics: "electronics",
};
const BLURB_KEYS: Record<
  string,
  "petBlurb" | "homeBlurb" | "mobilityBlurb" | "electronicsBlurb"
> = {
  pets: "petBlurb",
  "home-kitchen": "homeBlurb",
  mobility: "mobilityBlurb",
  electronics: "electronicsBlurb",
};

const ICONS: Record<string, typeof PawPrint> = {
  pets: PawPrint,
  "home-kitchen": House,
  mobility: Bike,
  electronics: Smartphone,
};

// Brand-consistent backdrops used until a real photo is supplied.
const BACKDROPS: Record<string, string> = {
  pets: "bg-linear-to-br from-gold-600 to-gold-400",
  "home-kitchen": "bg-linear-to-br from-navy-800 to-navy-600",
  mobility: "bg-linear-to-br from-navy-700 to-gold-600",
  electronics: "bg-linear-to-br from-navy-900 to-navy-700",
};

export async function CategoryTiles() {
  const dict = await getDictionary();

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-12">
      <h2 className="mb-4 text-2xl font-heading font-semibold">
        {dict.categories.shopByCategory}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {FEATURED_CATEGORIES.map((category) => {
          const Icon = ICONS[category.slug] ?? PawPrint;
          const backdrop = BACKDROPS[category.slug] ?? "bg-navy-800";

          return (
            <Link
              key={category.slug}
              href={category.href}
              className="group relative flex h-40 items-end overflow-hidden rounded-xl text-white sm:h-48"
            >
              {category.imageUrl ? (
                <>
                  <Image
                    src={category.imageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-navy-950/50" />
                </>
              ) : (
                <>
                  <div className={`absolute inset-0 ${backdrop}`} />
                  <Icon
                    aria-hidden
                    className="absolute -right-4 -top-4 size-40 text-white/15 transition-transform duration-300 group-hover:scale-110"
                  />
                </>
              )}

              <div className="relative z-10 flex w-full items-end justify-between gap-3 p-5">
                <div>
                  <p className="text-2xl font-heading font-semibold">
                    {LABEL_KEYS[category.slug]
                      ? dict.categories[LABEL_KEYS[category.slug]]
                      : category.label}
                  </p>
                  <p className="mt-0.5 text-sm text-white/80">
                    {BLURB_KEYS[category.slug]
                      ? dict.categories[BLURB_KEYS[category.slug]]
                      : category.blurb}
                  </p>
                </div>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20 transition-colors group-hover:bg-white/30">
                  <ArrowRight className="size-4" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
