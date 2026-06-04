// Server-side i18n resolver. `next/headers` is imported via require() inside
// the function bodies rather than as a top-level ES import so Next.js doesn't
// flag this module as a Server-Component-only entry point when it's reached
// from "use server" action files.
//
// (Normal `import { cookies, headers } from "next/headers"` would mark the
// whole module as RSC-only, and that propagates as "you're importing a
// component that needs next/headers" through any client/action chain that
// imports it transitively.)

import {
  dictFor,
  pickLocaleFromAcceptLanguage,
  type Locale,
  type Dict,
  isLocale,
} from "./index";

const LOCALE_COOKIE = "fcr_locale";

function nextHeaders() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("next/headers") as typeof import("next/headers");
}

/**
 * Resolve the active locale for this request, in priority order:
 *   1. Explicit `fcr_locale` cookie (set on login / signup / picker change)
 *   2. Accept-Language header (for first-time visitors pre-login)
 *   3. DEFAULT_LOCALE
 */
export function getLocale(): Locale {
  const { cookies, headers } = nextHeaders();
  const cookieValue = cookies().get(LOCALE_COOKIE)?.value;
  if (cookieValue && isLocale(cookieValue)) return cookieValue;
  const accept = headers().get("accept-language");
  return pickLocaleFromAcceptLanguage(accept);
}

/**
 * Server-side translation accessor. Drop-in replacement for the old static
 * `import { t } from "@/lib/i18n/ru"` — use as:
 *
 *     const t = getT();
 *     return <h1>{t.app.name}</h1>;
 */
export function getT(): Dict {
  return dictFor(getLocale());
}

export const LOCALE_COOKIE_NAME = LOCALE_COOKIE;

/**
 * Set the device's locale cookie. Called on successful login so the picker
 * and pre-login pages on this device pick up the family's chosen language.
 */
export function setLocaleCookie(locale: string): void {
  const value = isLocale(locale) ? locale : "ru";
  const { cookies } = nextHeaders();
  cookies().set({
    name: LOCALE_COOKIE,
    value,
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
