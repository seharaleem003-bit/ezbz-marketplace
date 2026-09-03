/**
 * Product structured data (schema.org JSON-LD).
 *
 * This is what turns a plain blue link into a rich result showing price,
 * availability and condition, and what makes a listing eligible for Google's
 * Shopping surfaces. Without it Google has to guess all three from the page
 * text, and usually declines to show any of them.
 *
 * Everything here is stated from real data. Inventing a rating or a review
 * count is the fastest way to a manual penalty, so neither is emitted.
 */

const CONDITION_URLS: Record<string, string> = {
  NEW: "https://schema.org/NewCondition",
  NEW_IN_BOX: "https://schema.org/NewCondition",
  OPEN_BOX: "https://schema.org/NewCondition",
  LIKE_NEW: "https://schema.org/UsedCondition",
  GOOD: "https://schema.org/UsedCondition",
  FAIR: "https://schema.org/UsedCondition",
  SALVAGE: "https://schema.org/DamagedCondition",
};

export interface ProductSchemaInput {
  name: string;
  description: string;
  url: string;
  images: string[];
  priceCents: number;
  condition: string;
  inStock: boolean;
  categoryPath: string[];
  sku: string;
}

export function ProductSchema({ product }: { product: ProductSchemaInput }) {
  const price = (product.priceCents / 100).toFixed(2);

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: product.name,
        description: product.description.slice(0, 600),
        image: product.images,
        sku: product.sku,
        category: product.categoryPath.join(" > "),
        offers: {
          "@type": "Offer",
          url: product.url,
          priceCurrency: "USD",
          price,
          itemCondition: CONDITION_URLS[product.condition] ?? "https://schema.org/UsedCondition",
          availability: product.inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          seller: { "@type": "Organization", name: "EZBZ Marketplace" },
          // Free shipping is a ranking and click-through signal in Shopping
          // results, so it's declared rather than left to be inferred.
          shippingDetails: {
            "@type": "OfferShippingDetails",
            shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "USD" },
            shippingDestination: {
              "@type": "DefinedRegion",
              addressCountry: "US",
            },
          },
        },
      },
      {
        // Breadcrumbs let Google show the category path instead of a raw URL.
        "@type": "BreadcrumbList",
        itemListElement: product.categoryPath.map((name, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name,
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Serialised rather than templated so quotes in a product title can't
      // break out of the script block.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
