import type { Metadata, Viewport } from "next";
import "./globals.css";
import { t } from "@/lib/i18n/ru";

export const metadata: Metadata = {
  title: t.app.name,
  description: t.app.name,
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#4c5ff0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
