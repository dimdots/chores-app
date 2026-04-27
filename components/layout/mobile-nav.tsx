"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type NavItem = { href: string; label: string };

// Same active-href logic as Header: longest-prefix match so nested routes
// (e.g. /parent/tasks/123) still highlight the parent section ("Задания").
function pickActiveHref(nav: NavItem[], pathname: string): string | null {
  let best: string | null = null;
  for (const n of nav) {
    if (pathname === n.href || pathname.startsWith(n.href + "/")) {
      if (!best || n.href.length > best.length) best = n.href;
    }
  }
  return best;
}

export function MobileNav({ nav }: { nav: NavItem[] }) {
  const pathname = usePathname() ?? "";
  const items = nav.slice(0, 4);
  const activeHref = pickActiveHref(items, pathname);
  return (
    <nav className="mx-auto max-w-5xl px-2">
      <ul className="grid grid-cols-4 gap-1">
        {items.map((n) => {
          const isActive = n.href === activeHref;
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center justify-center py-3 text-xs font-medium transition-colors rounded-lg",
                  isActive
                    ? "bg-brand-50 text-brand-800"
                    : "text-slate-600 hover:text-slate-900",
                )}
              >
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
