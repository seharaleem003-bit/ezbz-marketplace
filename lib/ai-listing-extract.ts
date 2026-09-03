import "server-only";

import Anthropic from "@anthropic-ai/sdk";

// Only used for the seller's OWN uploads (a screenshot they took of their
// own existing listing elsewhere, or their own product photos) — never for
// scraping third-party platforms. See lib/ebay.ts for the one platform
// (eBay) whose official API is used instead, per the brief's no-scraping
// rule.
export type ExtractedListingDraft = {
  title: string | null;
  description: string | null;
  condition: "NEW" | "NEW_IN_BOX" | "OPEN_BOX" | "LIKE_NEW" | "GOOD" | "FAIR" | "SALVAGE" | null;
  priceCents: number | null;
  categoryName: string | null;
};

const EXTRACT_TOOL = {
  name: "emit_listing_draft",
  description: "Return the best-effort listing details read from the image.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "A concise product title, 100 chars or less" },
      description: {
        type: "string",
        description: "A short buyer-facing description of the item's condition and features",
      },
      condition: {
        type: "string",
        enum: ["NEW", "NEW_IN_BOX", "OPEN_BOX", "LIKE_NEW", "GOOD", "FAIR", "SALVAGE"],
        description: "Best guess at physical condition from what's visible",
      },
      priceCents: {
        type: "integer",
        description: "Listed price in cents if a price is visible in the image, otherwise omit",
      },
      categoryName: {
        type: "string",
        description: "Which of the provided category names best fits this item",
      },
    },
    required: ["title", "description"],
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

export function isAiExtractConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function extractListingFromImage({
  imageBase64,
  mediaType,
  categoryNames,
}: {
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  categoryNames: string[];
}): Promise<ExtractedListingDraft> {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "emit_listing_draft" },
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
            text: `This is a seller's own photo or screenshot of an item they want to list on EZBZ, a liquidation marketplace. Read whatever is visible — a product photo, or a screenshot of a listing on another site — and draft a listing. Available categories: ${categoryNames.join(", ")}. If you can't confidently read a field, omit it rather than guessing wildly.`,
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    return { title: null, description: null, condition: null, priceCents: null, categoryName: null };
  }

  const input = toolUse.input as Record<string, unknown>;
  return {
    title: typeof input.title === "string" ? input.title : null,
    description: typeof input.description === "string" ? input.description : null,
    condition:
      typeof input.condition === "string" &&
      ["NEW", "NEW_IN_BOX", "OPEN_BOX", "LIKE_NEW", "GOOD", "FAIR", "SALVAGE"].includes(input.condition)
        ? (input.condition as ExtractedListingDraft["condition"])
        : null,
    priceCents: typeof input.priceCents === "number" ? Math.round(input.priceCents) : null,
    categoryName: typeof input.categoryName === "string" ? input.categoryName : null,
  };
}
