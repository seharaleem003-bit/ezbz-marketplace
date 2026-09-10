import "server-only";

import Anthropic from "@anthropic-ai/sdk";

/**
 * Translates catalogue copy into Spanish.
 *
 * Product listings cannot be translated from a dictionary — every one is
 * different, and there are hundreds. This runs at the point content is
 * created (and once over the back catalogue) so the storefront has Spanish
 * ready rather than translating on every page view.
 *
 * Every caller treats it as best-effort: a failure leaves the English in
 * place, which still renders a complete page.
 */

export function isAiTranslateConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function client() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic({ apiKey });
}

const GUIDANCE = `Translate retail copy from English into Latin American Spanish for a US discount marketplace.

- Keep brand names, model numbers, sizes and units exactly as they are: "42 inch" stays "42 inch", "VBGK" stays "VBGK". Shoppers search on them.
- Translate the product type and its describing words, not the specification.
- Keep it the same length or shorter. These are titles and short descriptions, not prose.
- Use the wording a Spanish-speaking shopper would search for, not a literal rendering.
- Return the translation only, with no preamble and no quotes around it.`;

const TOOL = {
  name: "emit_translations",
  input_schema: {
    type: "object" as const,
    properties: {
      translations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            n: { type: "integer", description: "The item's number, copied exactly." },
            es: { type: "string", description: "The Spanish text." },
          },
          required: ["n", "es"],
        },
      },
    },
    required: ["translations"],
  },
};

/**
 * Translates a batch of strings, returning a map of index to Spanish. Indexes
 * that the model omits or invents are dropped, so a partial response leaves
 * those items in English rather than mismatching translations to products.
 */
export async function translateBatch(items: string[]): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  if (items.length === 0) return out;

  const response = await client().messages.create({
    model: "claude-sonnet-5",
    max_tokens: 4096,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "emit_translations" },
    messages: [
      {
        role: "user",
        content: `${GUIDANCE}\n\nTranslate each numbered item:\n${items
          .map((t, i) => `${i}. ${t}`)
          .join("\n")}`,
      },
    ],
  });

  const use = response.content.find((c) => c.type === "tool_use");
  const list = (use?.input as { translations?: { n: number; es: string }[] })?.translations ?? [];
  for (const t of list) {
    if (!Number.isInteger(t.n) || t.n < 0 || t.n >= items.length) continue;
    if (typeof t.es !== "string" || !t.es.trim()) continue;
    out.set(t.n, t.es.trim());
  }
  return out;
}

/** Convenience for a single listing being saved in the admin. */
export async function translateListing(input: { title: string; description: string }) {
  const result = await translateBatch([input.title, input.description]);
  return {
    titleEs: result.get(0) ?? null,
    descriptionEs: result.get(1) ?? null,
  };
}
