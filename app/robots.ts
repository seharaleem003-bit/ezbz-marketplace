import type { MetadataRoute } from "next";

/**
 * Crawl rules.
 *
 * The disallow list isn't about secrecy — those routes are all authenticated
 * anyway — it's about crawl budget and index quality. Every request Google
 * spends on a checkout step is one it doesn't spend on a product, and pages
 * like /cart would otherwise show up in results as empty duplicates.
 */
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://ezbzmall.com").replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/account",
          "/checkout",
          "/cart",
          "/orders",
          "/wishlist",
          "/login",
          "/signup",
          "/reset-password",
          "/forgot-password",
          // Filter permutations generate near-infinite URL combinations that
          // all show slices of the same catalogue.
          "/listings?*condition=",
          "/listings?*minPrice=",
          "/listings?*maxPrice=",
          "/listings?*page=",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
