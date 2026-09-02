import "server-only";

import Anthropic from "@anthropic-ai/sdk";

/**
 * Writes search-engine copy for a single listing.
 *
 * Used when a listing is saved without it — a listing added by hand would
 * otherwise ship with empty tags, which is the difference between a page
 * Google can rank and one it can't. Bulk import gets the same fields from the
 * categorisation pass instead, so this is the manual-entry path.
 */

export interface SeoCopy {
  metaTitle: string | null;
  metaDescription: string | null;
  searchKeywords: string | null;
}

const TOOL = {
  name: "emit_seo",
  description: "Return search-engine copy for one product listing.",
  input_schema: {
    type: "object" as const,
    properties: {
      metaTitle: {
        type: "string",
        description:
          "SEO page title, at most 60 characters so Google doesn't truncate it. Lead with the words a shopper types — product type plus its key attribute. No site name; that's appended automatically.",
      },
      metaDescription: {
        type: "string",
        description:
          "Meta description, 140-155 characters. What it is, who it suits, and a concrete reason to click. No invented claims and no keyword stuffing — Google rewrites descriptions it judges spammy.",
      },
      searchKeywords: {
        type: "string",
        description:
          "8-12 comma-separated terms a shopper would realistically type, most likely first: generic product type, synonyms, key attributes, and buying-intent phrasing. Nothing the product isn't.",
      },
    },
    required: ["metaTitle", "metaDescription", "searchKeywords"],
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

export function isAiSeoConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function generateSeoCopy({
  title,
  description,
  categoryName,
  condition,
  priceCents,
}: {
  title: string;
  description: string;
  categoryName: string;
  condition: string;
  priceCents: number;
}): Promise<SeoCopy> {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 700,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "emit_seo" },
    messages: [
      {
        role: "user",
        content: [
          "Write the search-engine copy for this listing on EZBZ, a discount marketplace.",
          "Shoppers arrive comparing prices, so lead with what the item is rather than adjectives.",
          "",
          `Product : ${title}`,
          `Category: ${categoryName}`,
          `Condition: ${condition}`,
          `Price   : $${(priceCents / 100).toFixed(2)}`,
          "",
          `Description: ${description.slice(0, 900)}`,
        ].join("\n"),
      },
    ],
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );
  if (!toolUse) return { metaTitle: null, metaDescription: null, searchKeywords: null };

  const input = toolUse.input as Record<string, unknown>;
  const str = (v: unknown, max: number) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

  return {
    metaTitle: str(input.metaTitle, 60),
    metaDescription: str(input.metaDescription, 155),
    searchKeywords: str(input.searchKeywords, 500),
  };
}
