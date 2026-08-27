import "server-only";

import Anthropic from "@anthropic-ai/sdk";

/**
 * Files products into the category tree, inventing categories when nothing fits.
 *
 * The rule this enforces: every product ends up somewhere sensible. A model
 * asked only to pick from a fixed list will jam a hair clipper into "Tools"
 * rather than admit the list is wrong, so it is explicitly allowed to propose
 * a new category — and told to prefer an existing one when a reasonable match
 * exists, otherwise the tree fragments into a category per product.
 */

export interface CategorySuggestion {
  rowNumber: number;
  /** Slug of an existing category, when one fits. */
  existingSlug?: string;
  /** A category to create, when nothing fits. */
  newCategory?: { name: string; parentSlug: string | null };
  confidence: "high" | "medium" | "low";
}

const TOOL = {
  name: "emit_categories",
  description: "Assign every supplied product to a category.",
  input_schema: {
    type: "object" as const,
    properties: {
      assignments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            rowNumber: { type: "integer", description: "The product's row number, copied exactly." },
            existingSlug: {
              type: "string",
              description:
                "Slug of an existing category that genuinely fits. Prefer the most specific one. Omit if proposing a new category.",
            },
            newCategoryName: {
              type: "string",
              description:
                "Display name for a new category, when no existing one fits. Plural, shopper-facing, e.g. 'Hair clippers & trimmers'. Omit if using existingSlug.",
            },
            newCategoryParentSlug: {
              type: "string",
              description:
                "Slug of the existing category the new one should sit under. Use the top-level department it belongs in. Omit only if it must be a new top-level department.",
            },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
          },
          required: ["rowNumber", "confidence"],
        },
      },
    },
    required: ["assignments"],
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

export function isAiCategorizeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Products are sent in batches so one long sheet doesn't blow the context. */
const BATCH_SIZE = 25;

export async function categorizeProducts({
  products,
  categoryPaths,
}: {
  products: { rowNumber: number; title: string; description?: string }[];
  /** Existing tree as "slug — Parent > Child" lines. */
  categoryPaths: { slug: string; path: string }[];
}): Promise<CategorySuggestion[]> {
  const anthropic = getClient();
  const out: CategorySuggestion[] = [];

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "emit_categories" },
      messages: [
        {
          role: "user",
          content: [
            "File each product below into the catalogue of EZBZ, a discount marketplace.",
            "",
            "Existing categories (slug — full path):",
            ...categoryPaths.map((c) => `  ${c.slug} — ${c.path}`),
            "",
            "Rules:",
            "1. Prefer the most specific existing category that genuinely fits.",
            "2. If nothing fits, propose a new category rather than forcing a bad match —",
            "   a wrong category is worse than a new one. Give it a parent from the list.",
            "3. Don't create a category for a single product when a slightly broader one",
            "   would hold several. Group related products under one new category.",
            "4. Every product must get either existingSlug or newCategoryName.",
            "",
            "Products:",
            ...batch.map(
              (p) =>
                `  row ${p.rowNumber}: ${p.title}${p.description && p.description !== p.title ? ` — ${p.description.slice(0, 160)}` : ""}`
            ),
          ].join("\n"),
        },
      ],
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );
    if (!toolUse) continue;

    const assignments = (toolUse.input as { assignments?: unknown[] }).assignments ?? [];
    for (const raw of assignments) {
      const a = raw as Record<string, unknown>;
      const rowNumber = typeof a.rowNumber === "number" ? a.rowNumber : null;
      if (rowNumber == null) continue;

      const existingSlug = typeof a.existingSlug === "string" ? a.existingSlug : undefined;
      const newName = typeof a.newCategoryName === "string" ? a.newCategoryName.trim() : undefined;
      const parentSlug =
        typeof a.newCategoryParentSlug === "string" ? a.newCategoryParentSlug : undefined;

      out.push({
        rowNumber,
        existingSlug: existingSlug || undefined,
        newCategory: !existingSlug && newName ? { name: newName, parentSlug: parentSlug ?? null } : undefined,
        confidence:
          a.confidence === "high" || a.confidence === "low"
            ? (a.confidence as "high" | "low")
            : "medium",
      });
    }
  }

  return out;
}
