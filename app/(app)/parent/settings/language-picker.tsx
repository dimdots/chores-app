"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT, useLocale } from "@/lib/i18n/client";
import { type Locale, SUPPORTED_LOCALES } from "@/lib/i18n";
import { setLocaleAction } from "./actions";

const LABELS: Record<Locale, string> = {
  ru: "Русский",
  fr: "Français",
};

/**
 * Segmented control for changing the family's UI language. On click:
 *   - calls setLocaleAction (writes Family.locale + fcr_locale cookie)
 *   - router.refresh() so server components re-render with the new locale
 */
export function LanguagePicker() {
  const t = useT();
  const current = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);

  function select(locale: Locale) {
    if (locale === current || pending) return;
    setError(null);
    setPendingLocale(locale);
    start(async () => {
      const res = await setLocaleAction(locale);
      if (!res.ok) {
        setError(res.error);
        setPendingLocale(null);
        return;
      }
      // Force a fresh server render so every text in the tree picks up the
      // new locale without a hard reload.
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">{t.settings.languageHelp}</p>
      <div className="flex flex-wrap gap-2">
        {SUPPORTED_LOCALES.map((loc) => {
          const active = current === loc;
          const isPending = pendingLocale === loc;
          return (
            <button
              key={loc}
              type="button"
              onClick={() => select(loc)}
              disabled={pending}
              className={
                "h-11 rounded-xl border px-4 text-sm font-medium transition-colors " +
                (active
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50") +
                (pending ? " opacity-60 cursor-wait" : "")
              }
            >
              {isPending ? `${LABELS[loc]}…` : LABELS[loc]}
            </button>
          );
        })}
      </div>
      {error ? <p className="text-sm text-danger-700">{error}</p> : null}
    </div>
  );
}
