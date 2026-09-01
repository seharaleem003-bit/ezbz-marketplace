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
  /** Drives the "% off vs Amazon" badge and Deal Score. */
  amazonPriceCents: number | null;
  amazonUrl: string | null;
  retailPriceCents: number | null;
  /** Blank means "use the default"; 0 is a real answer (out of stock). */
  quantity: number | null;
  /** Parcel data — all four needed before Easyship will quote. */
  weightLb: number | null;
  lengthIn: number | null;
  widthIn: number | null;
  heightIn: number | null;
  /** Anything that stopped this row importing. */
  problem?: string;
}

type MappedField = Exclude<
  keyof ImportRow,
  "rowNumber" | "imageUrls" | "problem"
>;

// Order matters: more specific aliases are checked before looser ones, so an
// "Amazon Price" column isn't swallowed by the plain "price" matcher.
const HEADER_ALIASES: Record<MappedField, string[]> = {
  amazonPriceCents: ["amazon price", "amazon", "price on amazon", "competitor price"],
  amazonUrl: ["amazon link", "amazon url", "competitor link"],
  retailPriceCents: ["retail price", "rrp", "msrp", "list price", "was price"],
  title: ["title", "product title", "products title", "name", "product name", "item"],
  description: ["description", "product description", "products description", "details"],
  priceCents: ["price", "product price", "products price", "cost", "usd", "amount"],
  condition: ["condition", "product condition", "products condtion", "products condition"],
  colour: ["color", "colour", "product color"],
  quantity: ["quantity", "qty", "stock", "inventory", "units"],
  weightLb: ["weight", "weight lb", "weight lbs", "lbs", "lb"],
  lengthIn: ["length", "length in", "len"],
  widthIn: ["width", "width in"],
  heightIn: ["height", "height in"],
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

const CONDITIONS = ["NEW", "OPEN_BOX", "LIKE_NEW", "GOOD", "FAIR", "SALVAGE"];

function parseCondition(raw: string | null): string | null {
  if (!raw) return null;
  const n = normalise(raw).replace(/\s+/g, "_").toUpperCase();
  if (CONDITIONS.includes(n)) return n;
  if (n.startsWith("NEW")) return "NEW";
  if (n.includes("OPEN") && n.includes("BOX")) return "OPEN_BOX";
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

  // Map each wanted field to a column index. A column is claimed by the first
  // field that matches it, and a field only claims one column, so "Price" and
  // "Amazon Price" can't both end up pointing at the same cell.
  const columnFor: Partial<Record<MappedField, number>> = {};
  const claimed = new Set<number>();
  const imageColumns: number[] = [];

  headers.forEach((header, col) => {
    if (!header) return;
    const n = normalise(header);
    if (IMAGE_HEADER_HINTS.some((h) => n.includes(h))) {
      imageColumns.push(col);
      claimed.add(col);
    }
  });

  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [MappedField, string[]][]) {
    headers.forEach((header, col) => {
      if (!header || claimed.has(col) || columnFor[field] != null) return;
      const n = normalise(header);
      if (aliases.some((a) => n === a || n.includes(a))) {
        columnFor[field] = col;
        claimed.add(col);
      }
    });
  }

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

    const get = (key: MappedField) => {
      const col = columnFor[key];
      return col == null ? "" : cellText(row.getCell(col).value);
    };
    const num = (key: MappedField): number | null => {
      const raw = get(key).replace(/[^0-9.]/g, "");
      if (!raw) return null;
      const v = Number(raw);
      return Number.isFinite(v) ? v : null;
    };
    const cents = (key: MappedField) => {
      const v = num(key);
      return v != null && v > 0 ? Math.round(v * 100) : null;
    };

    const title = get("title");
    if (!title) return; // blank spacer row

    const images = imageColumns
      .map((col) => usableImageUrl(cellText(row.getCell(col).value)))
      .filter((u): u is string => Boolean(u));

    const priceCents = parsePrice(
      columnFor.priceCents == null ? null : row.getCell(columnFor.priceCents).value
    );

    const quantity = num("quantity");

    rows.push({
      rowNumber,
      title,
      description: get("description") || title,
      priceCents,
      condition: parseCondition(get("condition") || null),
      colour: get("colour") || null,
      imageUrls: images,
      amazonPriceCents: cents("amazonPriceCents"),
      amazonUrl: usableImageUrl(get("amazonUrl")) ?? (get("amazonUrl") || null),
      retailPriceCents: cents("retailPriceCents"),
      quantity: quantity != null && quantity >= 0 ? Math.round(quantity) : null,
      weightLb: num("weightLb"),
      lengthIn: num("lengthIn"),
      widthIn: num("widthIn"),
      heightIn: num("heightIn"),
      problem: priceCents == null ? "No usable price" : undefined,
    });
  });

  return { rows, headers: headers.filter(Boolean) };
}
