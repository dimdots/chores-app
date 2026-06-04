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
  const activeHref = pickActiveHref(nav, pathname);
  return (
    <nav className="mx-auto max-w-5xl px-2">
      <ul className={cn("flex gap-1", nav.length >= 5 && "text-[10px]")}>
        {nav.map((n) => {
          const isActive = n.href === activeHref;
          return (
            <li key={n.href} className="flex-1 min-w-0">
              <Link
                href={n.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center justify-center py-3 text-xs font-medium transition-colors rounded-lg",
                  nav.length >= 5 && "text-[10px] px-0.5",
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
