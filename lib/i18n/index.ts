import { ru, type Dict } from "./ru";
import { fr } from "./fr";

export type Locale = "ru" | "fr";

/**
 * The set of supported locales. Order matters for the language picker —
 * Russian first because the app started there.
 */
export const SUPPORTED_LOCALES = ["ru", "fr"] as const;

/**
 * Translation dictionaries, keyed by locale. Both dicts have the exact
 * same shape (enforced by the `Dict` type derived from ru).
 */
const DICTS: Record<Locale, Dict> = { ru, fr };

export const DEFAULT_LOCALE: Locale = "ru";

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Return the translation dictionary for a locale. Falls back to the default
 * if the input isn't a known locale — defensive against forged cookies or
 * stale URL params.
 */
export function dictFor(locale: string | null | undefined): Dict {
  if (locale && isLocale(locale)) return DICTS[locale];
  return DICTS[DEFAULT_LOCALE];
}

/**
 * Parse a browser Accept-Language header and pick the best-matching
 * supported locale. Used by pre-login pages where we don't have a family
 * cookie yet. Returns the default if no match.
 */
export function pickLocaleFromAcceptLanguage(
  header: string | null | undefined,
): Locale {
  if (!header) return DEFAULT_LOCALE;
  // Header looks like "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"
  const tags = header
    .split(",")
    .map((part) => {
      const [tag, qStr] = part.trim().split(";");
      const q = qStr?.startsWith("q=") ? parseFloat(qStr.slice(2)) : 1;
      return { tag: tag?.toLowerCase() ?? "", q: Number.isFinite(q) ? q : 0 };
    })
    .filter((x) => x.tag.length > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of tags) {
    // Match full ("fr") or prefix ("fr-fr" → "fr").
    const base = tag.split("-")[0];
    if (base && isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

export type { Dict };
export { ru, fr };
