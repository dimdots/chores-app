"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/client";
import { type Locale, SUPPORTED_LOCALES } from "@/lib/i18n";
import { setPublicLocaleAction } from "@/app/(public)/actions";
import { cn } from "@/lib/utils/cn";

// Short codes for the compact pre-login toggle.
const LABELS: Record<Locale, string> = {
  ru: "RU",
  fr: "FR",
};

/**
 * Compact RU/FR segmented control for the pre-login screens. Writes the
 * device locale cookie and refreshes so the server re-renders the page in
 * the chosen language. No auth needed.
 */
export function LocaleToggle() {
  const current = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();

  function select(locale: Locale) {
    if (locale === current || pending) return;
    start(async () => {
      await setPublicLocaleAction(locale);
      router.refresh();
    });
  }

  return (
    <div className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white p-0.5 text-xs">
      {SUPPORTED_LOCALES.map((loc) => {
        const active = current === loc;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => select(loc)}
            disabled={pending}
            aria-pressed={active}
            className={cn(
              "h-7 rounded-full px-2.5 font-semibold transition-colors disabled:opacity-60",
              active
                ? "bg-brand-600 text-white"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            {LABELS[loc]}
          </button>
        );
      })}
    </div>
  );
}
