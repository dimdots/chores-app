"use server";

import { revalidatePath } from "next/cache";
import { setLocaleCookie } from "@/lib/i18n/server";
import { isLocale } from "@/lib/i18n";

/**
 * Set the device locale cookie from a pre-login page (login / child-login /
 * signup). No auth required — this only affects the `fcr_locale` cookie on
 * this browser, not any Family record. Logging in later overwrites it with
 * the family's chosen language.
 */
export async function setPublicLocaleAction(locale: string) {
  if (!isLocale(locale)) return { ok: false as const, error: "invalid" };
  setLocaleCookie(locale);
  revalidatePath("/", "layout");
  return { ok: true as const };
}
