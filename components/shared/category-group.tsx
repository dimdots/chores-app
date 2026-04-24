"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Collapsible per-category section used by both parent and child task lists.
 * The collapsed state survives page refreshes via localStorage keyed by
 * `scope + category` so the parent can collapse "Особые миссии" once and
 * have it stay collapsed the next time they open the tasks list.
 *
 * scope examples:
 *   - "parent-tasks"          → parent's tasks list
 *   - "child-todo"            → kid's "to do today"
 *   - "child-done"            → kid's "done today"
 * Keep these distinct so collapsing a category in one view doesn't cascade
 * into an unrelated screen.
 */
export function CategoryGroup({
  scope,
  category,
  count,
  defaultCollapsed = false,
  headerRight,
  children,
}: {
  scope: string;
  category: string;
  count: number;
  defaultCollapsed?: boolean;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  const storageKey = `chores.collapse.${scope}.${category}`;
  // Start with the SSR-safe default so the markup matches on hydration, then
  // hydrate the real value from localStorage in an effect. This avoids the
  // "Hydration failed" warning that appears if we try to read localStorage
  // during initial render.
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === "1") setCollapsed(true);
      else if (raw === "0") setCollapsed(false);
    } catch {
      // localStorage unavailable (private mode, quota) — just use defaults.
    }
  }, [storageKey]);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-slate-50"
      >
        <Chevron expanded={!collapsed} />
        <h3 className="text-sm font-semibold text-slate-700">{category}</h3>
        <span className="text-xs font-medium text-slate-400">{count}</span>
        {headerRight ? <span className="ml-auto">{headerRight}</span> : null}
      </button>
      <div
        className={cn(
          "space-y-2 transition-all",
          collapsed ? "hidden" : "block",
        )}
      >
        {children}
      </div>
    </section>
  );
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={cn(
        "h-4 w-4 text-slate-400 transition-transform",
        expanded ? "rotate-90" : "rotate-0",
      )}
    >
      <path
        fillRule="evenodd"
        d="M7.21 5.21a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 11-1.06-1.06L10.94 10 7.21 6.27a.75.75 0 010-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}
