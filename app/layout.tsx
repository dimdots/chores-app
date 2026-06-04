import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getLocale, getT } from "@/lib/i18n/server";
import { LocaleProvider } from "@/lib/i18n/client";

// Metadata is generated per-request so the <title> reflects the active locale.
// Required `dynamic = "force-dynamic"` would normally be set on individual
// pages — Next 14 evaluates generateMetadata on the resolved layout tree.
export async function generateMetadata(): Promise<Metadata> {
  const t = getT();
  return {
    title: t.app.name,
    description: t.app.name,
    robots: { index: false, follow: false, nocache: true },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#4c5ff0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolve the locale once per request and hand it to the client provider
  // so every `useT()` in the tree picks it up.
  const locale = getLocale();
  return (
    <html lang={locale}>
      <body>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
