"use client";

import { useMemo, useState } from "react";
import { useT, useLocale } from "@/lib/i18n/client";
import { formatDateTime } from "@/lib/utils/dates";
import { formatSignedPoints } from "@/lib/utils/format";
import { ReactionBar } from "@/components/shared/reaction-bar";
import { cn } from "@/lib/utils/cn";

export type RecentActivityItem = {
  id: string;
  eventType: string;
  referenceLabel?: string | null;
  child?: { displayName: string } | null;
  createdAt: Date;
  pointsDelta: number;
  reactions: { counts: Record<string, number>; mine: string[] };
};

type FilterKey = "all" | "task" | "reward" | "adjustment";

/**
 * Recent-activity feed with client-side type filtering. Rows reflow onto two
 * lines (title + reference, then a muted who/when/points line) so they read
 * cleanly on narrow screens. The filter pills key off the eventType prefix
 * (TASK_* / REWARD_* / ADJUSTMENT_*) — no extra server round-trip.
 */
export function RecentActivity({ items }: { items: RecentActivityItem[] }) {
  const t = useT();
  const locale = useLocale();
  const [filter, setFilter] = useState<FilterKey>("all");

  const filters: { key: FilterKey; label: string; prefix: string | null }[] = [
    { key: "all", label: t.app.all, prefix: null },
    { key: "task", label: t.nav.tasks, prefix: "TASK" },
    { key: "reward", label: t.nav.rewards, prefix: "REWARD" },
    { key: "adjustment", label: t.points.adjustTitle, prefix: "ADJUSTMENT" },
  ];

  const visible = useMemo(() => {
    const prefix = filters.find((x) => x.key === filter)?.prefix ?? null;
    if (!prefix) return items;
    return items.filter((i) => i.eventType.startsWith(prefix));
  }, [items, filter]);

  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{t.app.empty}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={cn(
              "h-7 rounded-full px-3 text-xs font-medium transition-colors",
              filter === f.key
                ? "bg-brand-600 text-white"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-slate-500">{t.app.empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {visible.map((r) => (
            <li key={r.id} className="py-2.5 space-y-1.5">
              <div className="space-y-0.5">
                <p className="break-words text-slate-900">
                  {t.activity[r.eventType as keyof typeof t.activity] ?? r.eventType}
                  {r.referenceLabel ? (
                    <span className="font-medium"> · {r.referenceLabel}</span>
                  ) : null}
                </p>
                <p className="text-xs text-slate-500">
                  {r.child?.displayName ? `${r.child.displayName} · ` : ""}
                  {formatDateTime(r.createdAt, locale)}
                  {r.pointsDelta !== 0
                    ? ` · ${formatSignedPoints(r.pointsDelta, locale)}`
                    : ""}
                </p>
              </div>
              <ReactionBar
                activityLogId={r.id}
                counts={r.reactions.counts}
                mine={r.reactions.mine}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
