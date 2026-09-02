import "server-only";

import JSZip from "jszip";

/**
 * Pulls images that were pasted *into cells* out of an .xlsx.
 *
 * Google Sheets stores in-cell pictures as "rich values", not as floating
 * drawings, so ExcelJS reports zero images even when the file is full of
 * them. The chain to a real file is:
 *
 *   cell (vm="N")  →  metadata.xml bk[N-1] (rc v=I)
 *                  →  rdrichvalue.xml rv[I] (first <v> = R)
 *                  →  richValueRel.xml rel[R] (r:id)
 *                  →  richValueRel.xml.rels (Target)
 *                  →  xl/media/<file>
 *
 * Every step is an ordered list indexed from the previous one. This walks it
 * with regexes rather than an XML parser because the documents are tiny and
 * rigidly shaped; a dependency here would be more code than the parsing.
 */

export interface EmbeddedImage {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

const CONTENT_TYPES: Record<string, string> = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

const readText = async (zip: JSZip, path: string) =>
  (await zip.file(path)?.async("string")) ?? null;

/** All ordered matches of `re`'s first capture group. */
const captures = (xml: string, re: RegExp) => [...xml.matchAll(re)].map((m) => m[1]);

/**
 * @returns embedded images keyed by 1-based spreadsheet row number. A row with
 * several image cells keeps them in column order.
 */
export async function extractEmbeddedImages(
  xlsx: Buffer
): Promise<Map<number, EmbeddedImage[]>> {
  const out = new Map<number, EmbeddedImage[]>();
  const zip = await JSZip.loadAsync(xlsx);

  const [sheet, metadata, richValues, richRels, relsMap] = await Promise.all([
    readText(zip, "xl/worksheets/sheet1.xml"),
    readText(zip, "xl/metadata.xml"),
    readText(zip, "xl/richData/rdrichvalue.xml"),
    readText(zip, "xl/richData/richValueRel.xml"),
    readText(zip, "xl/richData/_rels/richValueRel.xml.rels"),
  ]);
  // A workbook with no in-cell images simply lacks the richData part.
  if (!sheet || !metadata || !richValues || !richRels || !relsMap) return out;

  // vm (1-based) -> rich value index
  const vmToRv = captures(metadata, /<bk>\s*<rc[^>]*\bv="(\d+)"/g).map(Number);
  // rich value index -> relationship index (first <v> of each <rv>)
  const rvToRel = captures(richValues, /<rv[^>]*>\s*<v>(\d+)<\/v>/g).map(Number);
  // relationship index -> rId
  const relToId = captures(richRels, /r:id="([^"]+)"/g);
  // rId -> media path
  const idToTarget = new Map<string, string>();
  for (const m of relsMap.matchAll(/<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"/g)) {
    idToTarget.set(m[1], m[2]);
  }
  // Attribute order isn't guaranteed, so match Id/Target either way round.
  for (const m of relsMap.matchAll(/<Relationship\b[^>]*\bTarget="([^"]+)"[^>]*\bId="([^"]+)"/g)) {
    idToTarget.set(m[2], m[1]);
  }

  const cells = [...sheet.matchAll(/<c\b[^>]*\br="([A-Z]+)(\d+)"[^>]*\bvm="(\d+)"/g)];

  for (const [, col, rowText, vmText] of cells) {
    const vm = Number(vmText);
    const rv = vmToRv[vm - 1];
    if (rv == null) continue;
    const rel = rvToRel[rv];
    if (rel == null) continue;
    const rId = relToId[rel];
    if (!rId) continue;
    const target = idToTarget.get(rId);
    if (!target) continue;

    const mediaPath = `xl/${target.replace(/^\.\.\//, "")}`;
    const file = zip.file(mediaPath);
    if (!file) continue;

    const ext = mediaPath.split(".").pop()?.toLowerCase() ?? "";
    const contentType = CONTENT_TYPES[ext];
    if (!contentType) continue;

    const buffer = Buffer.from(await file.async("nodebuffer"));
    const row = Number(rowText);
    const list = out.get(row) ?? [];
    list.push({ buffer, contentType, filename: `${col}${row}.${ext}` });
    out.set(row, list);
  }

  return out;
}
