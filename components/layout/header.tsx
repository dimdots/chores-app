"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/lib/i18n/ru";
import { cn } from "@/lib/utils/cn";
import { LogoutButton } from "./logout-button";

type NavItem = { href: string; label: string };

// A nav entry is "active" when the current pathname matches its href or is a
// nested route under it. We compare against the longest-matching href so that
// e.g. /parent/tasks/new lights up "Задания" (not just /parent which has no
// own entry). Without this every parent/* route would also match the brand
// link's href.
function pickActiveHref(nav: NavItem[], pathname: string): string | null {
  let best: string | null = null;
  for (const n of nav) {
    if (pathname === n.href || pathname.startsWith(n.href + "/")) {
      if (!best || n.href.length > best.length) best = n.href;
    }
  }
  return best;
}

export function Header({
  title,
  nav,
  role,
}: {
  title: string;
  nav: NavItem[];
  role: "PARENT" | "CHILD";
}) {
  const pathname = usePathname() ?? "";
  const activeHref = pickActiveHref(nav, pathname);
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-4">
        <Link
          href={role === "PARENT" ? "/parent/dashboard" : "/child/dashboard"}
          className="font-semibold text-slate-900"
        >
          {title}
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {nav.map((n) => {
            const isActive = n.href === activeHref;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-800 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <LogoutButton role={role} label={t.app.signOut} />
      </div>
    </header>
  );
}
