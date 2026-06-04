"use client";

import { createContext, useContext, type ReactNode } from "react";
import { dictFor, type Dict, type Locale } from "./index";

const LocaleContext = createContext<Locale>("ru");

/**
 * Wrap subtree with the active locale so client components calling `useT()`
 * pick up translated strings. Set on the root layout from a server component
 * that resolved the locale via cookie.
 */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

/**
 * Client-side translation hook. Drop-in replacement for the old static
 * `import { useT } from "@/lib/i18n/client";` inside any `"use client"` component:
 *
 *     const t = useT();
 *     return <button>{t.app.save}</button>;
 *
 * Reads the locale from React context — make sure `<LocaleProvider>` wraps
 * the tree (it does, via app/layout.tsx).
 */
export function useT(): Dict {
  const locale = useContext(LocaleContext);
  return dictFor(locale);
}

/** Read the active locale string (used by the language picker UI). */
export function useLocale(): Locale {
  return useContext(LocaleContext);
}
