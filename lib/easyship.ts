import "server-only";

// Confirmed live against the sandbox API (2026-07-26): base host differs by
// environment and the API is versioned by URL segment, not a header —
// neither is documented clearly enough to trust without verifying directly.
const EASYSHIP_API_VERSION = "2024-09";

function getBaseUrl(): string {
  const key = process.env.EASYSHIP_API_KEY;
  if (!key) throw new Error("EASYSHIP_API_KEY is not set");
  const isSandbox = key.startsWith("sand_");
  return isSandbox
    ? `https://public-api-sandbox.easyship.com/${EASYSHIP_API_VERSION}`
    : `https://public-api.easyship.com/${EASYSHIP_API_VERSION}`;
}

async function easyshipFetch(path: string, init?: RequestInit) {
  const key = process.env.EASYSHIP_API_KEY;
  if (!key) throw new Error("EASYSHIP_API_KEY is not set");

  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      data?.error?.details?.join("; ") || data?.error?.message || `Easyship request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

// The public shipments API wants an HS code per parcel item, not our
// storefront category. There's no "general merchandise" code, so this maps
// each EZBZ category to the closest customs category from
// GET /item_categories, verified live against the sandbox account.
const CATEGORY_HS_CODES: Record<string, string> = {
  electronics: "85198160", // Audio Video
  "home-kitchen": "85098000", // Home Appliances
  "tools-hardware": "94038990", // Home Decor (no close match; generic household fallback)
  "fitness-outdoors": "9506910000", // Sport & Leisure
  furniture: "94038990", // Home Decor
};
const DEFAULT_HS_CODE = "94038990";

const COUNTRY_ALPHA2: Record<string, string> = {
  "United States": "US",
  "United States of America": "US",
  Canada: "CA",
};

function toAlpha2(countryName: string): string {
  return COUNTRY_ALPHA2[countryName] ?? (countryName.length === 2 ? countryName.toUpperCase() : "US");
}

// EZBZ's own business address — used as the ship-from for EZBZ-direct
// inventory (no seller/fundraiser). Matches the origin address already on
// file with Stripe Tax. Seller-fulfilled orders need the seller's own
// address (not yet collected — see Seller model), so shipment creation for
// those is intentionally not wired up yet.
export const PLATFORM_ORIGIN_ADDRESS = {
  companyName: "EZBZ Marketplace",
  contactName: "EZBZ Marketplace",
  contactEmail: "admin@ezbz.dev",
  contactPhone: "12015550123",
  line1: "3325 Cardinal Ln",
  line2: null,
  city: "Irving",
  state: "TX",
  postalCode: "75061",
  countryAlpha2: "US",
};

export interface EasyshipOriginAddress {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  countryAlpha2: string;
}

export interface EasyshipOrderItem {
  description: string;
  quantity: number;
  priceCents: number;
  categorySlug: string | null;
}

export interface EasyshipDestination {
  contactName: string;
  contactEmail: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  countryName: string;
}

// Fallback parcel used when a listing has no measured weight/dimensions.
// Listings carry their own values now (Listing.weightGrams and friends); these
// only apply to older rows that predate those fields.
const DEFAULT_ITEM_WEIGHT_KG = 1;
const DEFAULT_DIMENSIONS_CM = { length: 30, width: 25, height: 15 };

export interface EasyshipRateItem {
  description: string;
  quantity: number;
  priceCents: number;
  categorySlug: string | null;
  weightKg: number;
  dimensionsCm: { length: number; width: number; height: number };
}

export interface EasyshipRate {
  courierName: string;
  serviceName: string;
  totalCents: number;
  minDeliveryDays: number | null;
  maxDeliveryDays: number | null;
}

// Quote-only: asks Easyship what this parcel would cost to ship without
// creating a shipment. Used at checkout so the buyer sees a real rate before
// paying, rather than after a label is bought.
export async function getShippingRates({
  origin,
  destination,
  items,
}: {
  origin: EasyshipOriginAddress;
  destination: EasyshipDestination;
  items: EasyshipRateItem[];
}): Promise<EasyshipRate[]> {
  const body = {
    origin_address: {
      line_1: origin.line1,
      city: origin.city,
      state: origin.state,
      postal_code: origin.postalCode,
      country_alpha2: origin.countryAlpha2,
    },
    destination_address: {
      line_1: destination.line1,
      city: destination.city,
      state: destination.state,
      postal_code: destination.postalCode,
      country_alpha2: toAlpha2(destination.countryName),
    },
    parcels: [
      {
        items: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          actual_weight: item.weightKg,
          declared_customs_value: Math.round(item.priceCents) / 100,
          declared_currency: "USD",
          hs_code: (item.categorySlug && CATEGORY_HS_CODES[item.categorySlug]) || DEFAULT_HS_CODE,
          dimensions: item.dimensionsCm,
        })),
      },
    ],
  };

  const data = await easyshipFetch("/rates", { method: "POST", body: JSON.stringify(body) });

  const rates = Array.isArray(data?.rates) ? data.rates : [];
  return rates.map((rate: Record<string, unknown>) => ({
    courierName: String(rate.courier_name ?? "Carrier"),
    serviceName: String(rate.courier_service_name ?? "Standard"),
    totalCents: Math.round(Number(rate.total_charge ?? 0) * 100),
    minDeliveryDays: rate.min_delivery_time == null ? null : Number(rate.min_delivery_time),
    maxDeliveryDays: rate.max_delivery_time == null ? null : Number(rate.max_delivery_time),
  }));
}

export async function createShipmentForOrder({
  origin,
  destination,
  items,
}: {
  origin: EasyshipOriginAddress;
  destination: EasyshipDestination;
  items: EasyshipOrderItem[];
}) {
  const body = {
    origin_address: {
      line_1: origin.line1,
      line_2: origin.line2 ?? undefined,
      city: origin.city,
      state: origin.state,
      postal_code: origin.postalCode,
      country_alpha2: origin.countryAlpha2,
      contact_name: origin.contactName,
      contact_phone: origin.contactPhone,
      contact_email: origin.contactEmail,
      company_name: origin.companyName,
    },
    destination_address: {
      line_1: destination.line1,
      line_2: destination.line2 ?? undefined,
      city: destination.city,
      state: destination.state,
      postal_code: destination.postalCode,
      country_alpha2: toAlpha2(destination.countryName),
      contact_name: destination.contactName,
      contact_phone: origin.contactPhone, // buyers don't give us a phone at checkout
      contact_email: destination.contactEmail,
    },
    parcels: [
      {
        items: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          actual_weight: DEFAULT_ITEM_WEIGHT_KG,
          declared_customs_value: Math.round((item.priceCents / 100) * 100) / 100,
          declared_currency: "USD",
          hs_code: (item.categorySlug && CATEGORY_HS_CODES[item.categorySlug]) || DEFAULT_HS_CODE,
          dimensions: DEFAULT_DIMENSIONS_CM,
        })),
      },
    ],
  };

  const data = await easyshipFetch("/shipments", { method: "POST", body: JSON.stringify(body) });
  return data.shipment as { easyship_shipment_id: string; tracking_page_url: string | null };
}

export async function buyLabelForShipment(easyshipShipmentId: string, courierServiceId?: string) {
  const body = courierServiceId ? { courier_service_id: courierServiceId } : {};
  const data = await easyshipFetch(`/shipments/${easyshipShipmentId}/label`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data.shipment;
}

export async function getShipment(easyshipShipmentId: string) {
  const data = await easyshipFetch(`/shipments/${easyshipShipmentId}`);
  return data.shipment;
}
