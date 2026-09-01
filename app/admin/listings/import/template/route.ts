import ExcelJS from "exceljs";

import { requireCatalogAccess } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";

/**
 * Downloadable blank listing sheet.
 *
 * Generated on request rather than shipped as a static file so it can't drift
 * out of step with what the importer actually accepts — the headers here are
 * the ones lib/catalog-import.ts matches.
 */

const COLUMNS: { header: string; width: number; note: string; example: string | number }[] = [
  { header: "Title", width: 46, note: "Required. Shopper-facing product name.", example: "Clear Acrylic Dog Playpen, 8 Panels, 24in" },
  { header: "Description", width: 52, note: "Optional. Falls back to the title.", example: "Transparent 8-panel pen for puppies and small dogs. Easy to wipe clean." },
  { header: "Price", width: 12, note: "Required. Your selling price in USD.", example: 65 },
  { header: "Amazon Price", width: 14, note: "Turns on the % off badge and Deal Score.", example: 119.99 },
  { header: "Retail Price", width: 13, note: "Optional. Shown struck through.", example: 89.99 },
  { header: "Quantity", width: 10, note: "Stock on hand. Defaults to 10 if blank.", example: 4 },
  { header: "Condition", width: 14, note: "New, Open Box, Like New, Good, Fair, Salvage.", example: "New" },
  { header: "Color", width: 12, note: "Optional. Appended to the description.", example: "Clear" },
  { header: "Weight (lb)", width: 12, note: "All four size fields needed for live shipping rates.", example: 12.5 },
  { header: "Length (in)", width: 12, note: "Longest side of the shipping box.", example: 24 },
  { header: "Width (in)", width: 12, note: "", example: 18 },
  { header: "Height (in)", width: 12, note: "", example: 10 },
  { header: "Image URL", width: 54, note: "Direct link to the image file. Google Drive share links do not work.", example: "https://m.media-amazon.com/images/I/71example._AC_SL1500_.jpg" },
  { header: "Image URL 2", width: 54, note: "Optional extra photo. Add more columns if you need them.", example: "" },
  { header: "Amazon Link", width: 40, note: "Optional. Used by the Compare on Amazon button.", example: "" },
];

export async function GET() {
  // Same permission as the importer itself.
  await requireCatalogAccess();

  const wb = new ExcelJS.Workbook();
  wb.creator = "EZBZ Marketplace";
  wb.created = new Date();

  const ws = wb.addWorksheet("Listings");
  ws.columns = COLUMNS.map((c) => ({ header: c.header, key: c.header, width: c.width }));

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0A1930" } };
  header.alignment = { vertical: "middle" };
  header.height = 22;

  // One worked example, so the expected format is obvious. Delete before use —
  // the importer would otherwise create it as a real product.
  const example = ws.addRow(COLUMNS.map((c) => c.example));
  example.font = { italic: true, color: { argb: "FF888888" } };

  ws.views = [{ state: "frozen", ySplit: 1 }];

  // Notes live on a second sheet: the importer only reads the first one, so
  // guidance here can't be mistaken for a product row.
  const notes = wb.addWorksheet("How to use");
  notes.columns = [
    { header: "Column", key: "c", width: 20 },
    { header: "What it does", key: "n", width: 80 },
  ];
  const nh = notes.getRow(1);
  nh.font = { bold: true, color: { argb: "FFFFFFFF" } };
  nh.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0A1930" } };
  COLUMNS.filter((c) => c.note).forEach((c) => notes.addRow({ c: c.header, n: c.note }));
  notes.addRow({});
  notes.addRow({ c: "Delete row 2", n: "The grey italic example row is a sample — remove it before importing." });
  notes.addRow({ c: "Headings", n: "Matched loosely: \"Products Price\", \"Price\" and \"Cost\" all work." });
  notes.addRow({ c: "Categories", n: "Leave them out — EZBZ files each product automatically and creates categories where none fit." });
  notes.addRow({ c: "Where to upload", n: "Admin > Listings > Import from file." });

  const buffer = await wb.xlsx.writeBuffer();

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="ezbz-listing-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
