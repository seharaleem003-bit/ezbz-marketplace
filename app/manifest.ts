import type { MetadataRoute } from "next";

/**
 * Web app manifest — what makes EZBZ installable on Android and iOS.
 *
 * Installed from the browser rather than a store: same code as the website,
 * so the catalogue, checkout and account pages can never drift out of sync
 * with a separately-shipped binary.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EZBZ Marketplace",
    short_name: "EZBZ",
    description:
      "Discounted deals with Deal Score™ ratings, so you know exactly what you're buying. Free shipping on every order.",
    start_url: "/",
    // No browser chrome once installed, so it reads as an app rather than a
    // bookmark.
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a1930",
    theme_color: "#0a1930",
    categories: ["shopping"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // Android crops icons to its own shape; the maskable version keeps the
      // logo inside the safe area so it isn't clipped.
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Browse deals", url: "/listings" },
      { name: "Your cart", url: "/cart" },
      { name: "Your orders", url: "/orders" },
    ],
  };
}
