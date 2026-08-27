import "server-only";

import Anthropic from "@anthropic-ai/sdk";

/**
 * Builds a complete, SEO-ready listing from a product photo.
 *
 * Deliberately image-in, original-copy-out. The brief rules out scraping or
 * reproducing Amazon's product content (copyright), and Amazon exposes no way
 * to resolve an image back to a product anyway. So the model describes what it
 * can actually see and writes fresh copy, which is both lawful and better for
 * search: duplicated manufacturer text is exactly what search engines
 * discount.
 *
 * Everything returned is a draft for a human to approve — the model can only
 * report what's visible, so specifications it cannot see are left empty rather
 * than invented.
 */

export type EnrichedListing = {
  title: string | null;
  description: string | null;
  /** Short scannable selling points. */
  features: string[];
  condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "SALVAGE" | null;
  categoryName: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  searchKeywords: string[];
  /** Model's own flag that the photo was too unclear to describe reliably. */
  lowConfidence: boolean;
};

const ENRICH_TOOL = {
  name: "emit_listing",
  description: "Return a complete marketplace listing drafted from the product photo.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: {
        type: "string",
        description:
          "Shopper-facing product title, 60-90 characters. Lead with the product type and its most searched attributes (material, size, colour, pack count) — not with a brand you cannot actually read in the photo.",
      },
      description: {
        type: "string",
        description:
          "Two or three short paragraphs describing the item, what it is used for, and who it suits. Plain, concrete, honest. Never invent specifications, brand names, certifications, or measurements that are not visible in the photo.",
      },
      features: {
        type: "array",
        items: { type: "string" },
        description: "3-6 short bullet selling points, each under 100 characters.",
      },
      condition: {
        type: "string",
        enum: ["NEW", "LIKE_NEW", "GOOD", "FAIR", "SALVAGE"],
        description: "Physical condition judged from the photo.",
      },
      categoryName: {
        type: "string",
        description: "Whichever of the supplied category names fits best.",
      },
      metaTitle: {
        type: "string",
        description:
          "SEO <title>, at most 60 characters so it is not truncated in results. Front-load the primary search term.",
      },
      metaDescription: {
        type: "string",
        description:
          "SEO meta description, 140-155 characters, written to earn the click without inventing claims.",
      },
      searchKeywords: {
        type: "array",
        items: { type: "string" },
        description:
          "5-10 search terms a shopper would realistically type, including synonyms and common misspellings of the product type.",
      },
      lowConfidence: {
        type: "boolean",
        description:
          "True when the photo is too unclear, cropped, or ambiguous to describe the product reliably.",
      },
    },
    required: ["title", "description", "metaTitle", "metaDescription"],
  },
};

let client: Anthropic | undefined;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey });
  }
  return client;
}

export function isAiEnrichConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const asString = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const asStringArray = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];

export async function enrichListingFromImage({
  imageBase64,
  mediaType,
  categoryNames,
  hint,
}: {
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  categoryNames: string[];
  /** Optional operator note — a model number or detail the photo doesn't show. */
  hint?: string;
}): Promise<EnrichedListing> {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2048,
    tools: [ENRICH_TOOL],
    tool_choice: { type: "tool", name: "emit_listing" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          {
            type: "text",
            text: [
              "Draft a product listing for EZBZ, a discount marketplace, from this product photo.",
              "",
              "Write original copy describing what you can actually see. Do not reproduce any",
              "retailer's product description, and do not state brands, model numbers,",
              "measurements, materials, or certifications unless they are legible in the image —",
              "an honest shorter listing is worth more than a detailed invented one. Set",
              "lowConfidence if the photo does not let you identify the product.",
              "",
              `Available categories: ${categoryNames.join(", ")}.`,
              hint ? `\nOperator notes about this item: ${hint}` : "",
            ].join("\n"),
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    return {
      title: null,
      description: null,
      features: [],
      condition: null,
      categoryName: null,
      metaTitle: null,
      metaDescription: null,
      searchKeywords: [],
      lowConfidence: true,
    };
  }

  const input = toolUse.input as Record<string, unknown>;
  const condition = asString(input.condition);

  return {
    title: asString(input.title),
    description: asString(input.description),
    features: asStringArray(input.features),
    condition:
      condition && ["NEW", "LIKE_NEW", "GOOD", "FAIR", "SALVAGE"].includes(condition)
        ? (condition as EnrichedListing["condition"])
        : null,
    categoryName: asString(input.categoryName),
    // Trim to the lengths search engines actually render, in case the model
    // overshoots the instruction.
    metaTitle: asString(input.metaTitle)?.slice(0, 60) ?? null,
    metaDescription: asString(input.metaDescription)?.slice(0, 155) ?? null,
    searchKeywords: asStringArray(input.searchKeywords),
    lowConfidence: input.lowConfidence === true,
  };
}
