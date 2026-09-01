import "server-only";

// eBay's official Browse API — the "safe path" the brief calls for, since
// it's sanctioned data access rather than scraping. Field names/response
// shape below are written from eBay's published Browse API docs, not
// verified live — EBAY_CLIENT_ID/EBAY_CLIENT_SECRET haven't been provided
// yet. Same situation Easyship and Checkr were in before being confirmed
// against a real account; expect adjustments once real credentials land.

function getEnv(): "SANDBOX" | "PRODUCTION" {
  return process.env.EBAY_ENVIRONMENT === "PRODUCTION" ? "PRODUCTION" : "SANDBOX";
}

function getApiBase(): string {
  return getEnv() === "PRODUCTION" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";
}

export function isEbayConfigured(): boolean {
  return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
}

// Extracts the numeric legacy item ID from a typical eBay item URL, e.g.
// https://www.ebay.com/itm/Some-Item-Title/123456789012 or
// https://www.ebay.com/itm/123456789012 — returns null if the URL doesn't
// look like an eBay item link at all.
export function parseEbayLegacyItemId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!/(^|\.)ebay\.[a-z.]+$/i.test(parsed.hostname)) return null;

  const match = parsed.pathname.match(/(\d{9,15})(?:\/|$)/);
  return match ? match[1] : null;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("EBAY_CLIENT_ID/EBAY_CLIENT_SECRET are not set");

  const identityBase =
    getEnv() === "PRODUCTION" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${identityBase}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error_description || `eBay auth failed (${res.status})`);
  }

  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

export type EbayItem = {
  title: string;
  priceCents: number | null;
  currency: string | null;
  condition: string | null;
  description: string | null;
  imageUrls: string[];
};

// eBay's condition strings -> our ListingCondition enum. Not exhaustive —
// eBay uses dozens of category-specific condition IDs/names; this covers
// the common general-merchandise ones and falls back to GOOD.
const EBAY_CONDITION_MAP: Record<string, string> = {
  New: "NEW",
  "New with tags": "NEW",
  "New without tags": "NEW",
  "Open box": "OPEN_BOX",
  "Certified - Refurbished": "LIKE_NEW",
  "Excellent - Refurbished": "LIKE_NEW",
  "Very Good - Refurbished": "GOOD",
  "Good - Refurbished": "GOOD",
  "Pre-owned": "GOOD",
  Used: "GOOD",
  "For parts or not working": "SALVAGE",
};

export function mapEbayCondition(ebayCondition: string | null | undefined): string {
  if (!ebayCondition) return "GOOD";
  return EBAY_CONDITION_MAP[ebayCondition] ?? "GOOD";
}

export async function getEbayItemByLegacyId(legacyItemId: string): Promise<EbayItem> {
  const token = await getAccessToken();

  const res = await fetch(
    `${getApiBase()}/buy/browse/v1/item/get_item_by_legacy_id?legacy_item_id=${legacyItemId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      },
    }
  );

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.errors?.[0]?.message || `eBay item lookup failed (${res.status})`;
    throw new Error(message);
  }

  const imageUrls = [
    data.image?.imageUrl,
    ...(Array.isArray(data.additionalImages)
      ? data.additionalImages.map((img: { imageUrl?: string }) => img.imageUrl)
      : []),
  ].filter((url): url is string => Boolean(url));

  return {
    title: data.title ?? "",
    priceCents: data.price?.value ? Math.round(Number(data.price.value) * 100) : null,
    currency: data.price?.currency ?? null,
    condition: data.condition ?? null,
    description: data.shortDescription ?? null,
    imageUrls,
  };
}
