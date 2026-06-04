import type { Locale } from "@/lib/i18n";

/**
 * Locale-aware noun for "points". Russian needs three forms (очко / очка /
 * очков); French and English use singular/plural.
 */
export function pluralizePoints(n: number, locale: Locale = "ru"): string {
  const abs = Math.abs(n);
  if (locale === "fr") {
    // French: "point" / "points". Singular only for ±1 (and 0 uses plural).
    return abs === 1 ? "point" : "points";
  }
  // Russian (default).
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 14) return "очков";
  if (mod10 === 1) return "очко";
  if (mod10 >= 2 && mod10 <= 4) return "очка";
  return "очков";
}

export function formatPoints(n: number, locale: Locale = "ru"): string {
  return `${n} ${pluralizePoints(n, locale)}`;
}

export function formatSignedPoints(n: number, locale: Locale = "ru"): string {
  if (n > 0) return `+${n} ${pluralizePoints(n, locale)}`;
  if (n < 0) return `${n} ${pluralizePoints(n, locale)}`;
  return `0 ${pluralizePoints(0, locale)}`;
}
