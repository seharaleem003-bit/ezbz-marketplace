import type { Locale } from "@/lib/i18n/config";

/**
 * Picks catalogue copy for the current language.
 *
 * The dictionaries translate the site's own wording — buttons, headings,
 * labels. Product titles, descriptions and category names live in the
 * database and cannot come from a dictionary, so they are stored per language
 * alongside the English.
 *
 * Always falls back to English. A listing added a minute ago has no
 * translation yet, and a half-Spanish page is better than a blank title.
 */
export function localized(english: string, spanish: string | null | undefined, locale: Locale): string {
  if (locale === "es" && spanish && spanish.trim()) return spanish;
  return english;
}

/** Shape shared by anything with translatable catalogue copy. */
export interface TranslatableCategory {
  name: string;
  nameEs?: string | null;
}

export function categoryName(category: TranslatableCategory, locale: Locale): string {
  return localized(category.name, category.nameEs, locale);
}

export interface TranslatableListing {
  title: string;
  titleEs?: string | null;
  description?: string;
  descriptionEs?: string | null;
}

export function listingTitle(listing: TranslatableListing, locale: Locale): string {
  return localized(listing.title, listing.titleEs, locale);
}

export function listingDescription(listing: TranslatableListing, locale: Locale): string {
  return localized(listing.description ?? "", listing.descriptionEs, locale);
}
