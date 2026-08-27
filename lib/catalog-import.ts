import "server-only";

import ExcelJS from "exceljs";

/**
 * Reads a supplier spreadsheet into rows the importer can work with.
 *
 * Column headers are matched loosely rather than by exact position, because
 * supplier sheets never agree on wording — "Products Price", "Price", "USD"
 * all mean the same thing, and insisting on one spelling makes the feature
 * useless the first time a file arrives slightly different.
 */

export interface ImportRow {
  rowNumber: number;
  title: string;
  description: string;
  priceCents: number | null;
  condition: string | null;
  colour: string | null;
  imageUrls: string[];
  /** Anything that stopped this row importing. */
  problem?: string;
}

const HEADER_ALIASES: Record<keyof Omit<ImportRow, "rowNumber" | "imageUrls" | "problem">, string[]> = {
  title: ["title", "product title", "products title", "name", "product name", "item"],
  description: ["description", "product description", "products description", "details"],
  priceCents: ["price", "product price", "products price", "cost", "usd", "amount"],
  condition: ["condition", "product condition", "products condtion", "products condition"],
  colour: ["color", "colour", "product color"],
};

const IMAGE_HEADER_HINTS = ["image", "photo", "picture", "img"];

const normalise = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Drive share links can't be used as image sources; only direct files work. */
function usableImageUrl(raw: string): string | null {
  const value = raw.trim();
  if (!/^https?:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    // A Drive "view" link serves an HTML page, not an image.
    if (url.hostname.includes("drive.google.com")) return null;
    return value;
  } catch {
    return null;
  }
}

function parsePrice(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.round(raw * 100);
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null;
}

const CONDITIONS = ["NEW", "LIKE_NEW", "GOOD", "FAIR", "SALVAGE"];

function parseCondition(raw: string | null): string | null {
  if (!raw) return null;
  const n = normalise(raw).replace(/\s+/g, "_").toUpperCase();
  if (CONDITIONS.includes(n)) return n;
  if (n.startsWith("NEW")) return "NEW";
  if (n.includes("LIKE")) return "LIKE_NEW";
  if (n.startsWith("GOOD") || n.includes("USED")) return "GOOD";
  if (n.startsWith("FAIR")) return "FAIR";
  return null;
}

/** Cell value as plain text, flattening ExcelJS's rich-text and hyperlink shapes. */
function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (typeof v.text === "string") return v.text.trim();
    if (typeof v.hyperlink === "string") return v.hyperlink.trim();
    if (Array.isArray(v.richText)) {
      return v.richText.map((p) => (p as { text?: string }).text ?? "").join("").trim();
    }
    if (v.result != null) return String(v.result).trim();
  }
  return "";
}

export async function parseCatalogFile(
  buffer: Buffer,
  filename: string
): Promise<{ rows: ImportRow[]; headers: string[]; error?: string }> {
  const workbook = new ExcelJS.Workbook();

  try {
    if (/\.csv$/i.test(filename)) {
      const { Readable } = await import("node:stream");
      await workbook.csv.read(Readable.from(buffer.toString("utf8")));
    } else {
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    }
  } catch {
    return { rows: [], headers: [], error: "Couldn't read that file. Upload an .xlsx or .csv." };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return { rows: [], headers: [], error: "That file has no sheets." };

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = cellText(cell.value);
  });

  // Map each wanted field to a column index.
  const columnFor: Partial<Record<keyof typeof HEADER_ALIASES, number>> = {};
  const imageColumns: number[] = [];

  headers.forEach((header, col) => {
    if (!header) return;
    const n = normalise(header);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      const key = field as keyof typeof HEADER_ALIASES;
      if (columnFor[key] != null) continue;
      if (aliases.some((a) => n === a || n.includes(a))) columnFor[key] = col;
    }
    if (IMAGE_HEADER_HINTS.some((h) => n.includes(h))) imageColumns.push(col);
  });

  if (columnFor.title == null) {
    return {
      rows: [],
      headers: headers.filter(Boolean),
      error:
        "Couldn't find a product title column. Name one column \"Title\" (or \"Product Title\") and re-upload.",
    };
  }

  const rows: ImportRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const get = (key: keyof typeof HEADER_ALIASES) => {
      const col = columnFor[key];
      return col == null ? "" : cellText(row.getCell(col).value);
    };

    const title = get("title");
    if (!title) return; // blank spacer row

    const images = imageColumns
      .map((col) => usableImageUrl(cellText(row.getCell(col).value)))
      .filter((u): u is string => Boolean(u));

    const priceCents = parsePrice(
      columnFor.priceCents == null ? null : row.getCell(columnFor.priceCents).value
    );

    rows.push({
      rowNumber,
      title,
      description: get("description") || title,
      priceCents,
      condition: parseCondition(get("condition") || null),
      colour: get("colour") || null,
      imageUrls: images,
      problem: priceCents == null ? "No usable price" : undefined,
    });
  });

  return { rows, headers: headers.filter(Boolean) };
}
