"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/lib/i18n/ru";
import { createTasksFromPresetsAction } from "@/app/(app)/parent/tasks/actions";

// A single preset row prepared server-side: the category name from the
// preset catalog has already been resolved to a concrete categoryId so the
// client just hands that back to the server action on submit. We keep the
// defaultPoints around so the UI can show it next to the editable input.
export type ResolvedPreset = {
  key: string; // stable id for react (group + title)
  title: string;
  description?: string;
  group: string;
  categoryId: string;
  categoryName: string;
  defaultPoints: number;
};

type RowState = {
  selected: boolean;
  points: number;
};

export function PresetPicker({ presets }: { presets: ResolvedPreset[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Keep row state keyed by preset.key so it survives re-renders. Points
  // start at defaultPoints but are fully editable — the user explicitly
  // asked to preserve this ability when picking from presets.
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      presets.map((p) => [p.key, { selected: false, points: p.defaultPoints }]),
    ),
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ResolvedPreset[]>();
    for (const p of presets) {
      if (!map.has(p.group)) map.set(p.group, []);
      map.get(p.group)!.push(p);
    }
    return Array.from(map.entries());
  }, [presets]);

  const selectedCount = useMemo(
    () => Object.values(rows).filter((r) => r.selected).length,
    [rows],
  );

  function toggleSelected(key: string) {
    setRows((prev) => ({
      ...prev,
      [key]: { ...prev[key]!, selected: !prev[key]!.selected },
    }));
  }

  function setPoints(key: string, points: number) {
    setRows((prev) => ({
      ...prev,
      [key]: { ...prev[key]!, points },
    }));
  }

  function toggleGroup(groupPresets: ResolvedPreset[]) {
    const allSelected = groupPresets.every((p) => rows[p.key]?.selected);
    setRows((prev) => {
      const next = { ...prev };
      for (const p of groupPresets) {
        next[p.key] = { ...next[p.key]!, selected: !allSelected };
      }
      return next;
    });
  }

  function submit() {
    setError(null);
    const items = presets
      .filter((p) => rows[p.key]?.selected)
      .map((p) => ({
        title: p.title,
        description: p.description ?? null,
        categoryId: p.categoryId,
        points: Math.max(0, Math.floor(rows[p.key]!.points || 0)),
      }));

    if (items.length === 0) {
      setError(t.tasks.presetsNoneSelected);
      return;
    }

    start(async () => {
      const res = await createTasksFromPresetsAction(items);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/parent/tasks");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">{t.tasks.presetsHelp}</p>

      <div className="space-y-4">
        {grouped.map(([group, groupPresets]) => {
          const allSelected = groupPresets.every((p) => rows[p.key]?.selected);
          return (
            <Card key={group}>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">{group}</h3>
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupPresets)}
                    className="text-xs font-medium text-brand-700 hover:text-brand-800"
                  >
                    {allSelected ? t.tasks.presetsDeselectAll : t.tasks.presetsSelectAll}
                  </button>
                </div>
                <ul className="divide-y divide-slate-100">
                  {groupPresets.map((p) => {
                    const row = rows[p.key]!;
                    return (
                      <li key={p.key} className="py-2 flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => toggleSelected(p.key)}
                          aria-label={p.title}
                          className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {p.title}
                          </p>
                          {p.description ? (
                            <p className="text-xs text-slate-500 truncate">{p.description}</p>
                          ) : null}
                          <p className="text-xs text-slate-400">{p.categoryName}</p>
                        </div>
                        <div className="shrink-0 w-20">
                          <Input
                            type="number"
                            min={0}
                            max={1_000_000}
                            value={row.points}
                            onChange={(e) =>
                              setPoints(p.key, Number.parseInt(e.target.value || "0", 10))
                            }
                            aria-label={`${t.tasks.points} — ${p.title}`}
                            className="h-9 text-right"
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error ? <p className="text-sm text-danger-700">{error}</p> : null}

      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
        <span className="text-sm text-slate-600">
          {t.tasks.presetsSelected.replace("{count}", String(selectedCount))}
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            {t.app.cancel}
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={pending || selectedCount === 0}
          >
            {pending ? t.app.loading : t.tasks.presetsAdd}
          </Button>
        </div>
      </div>
    </div>
  );
}
