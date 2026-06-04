"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/lib/i18n/client";
import { useToast } from "@/components/ui/toast";

export type UserTaskRow = {
  id: string;
  title: string;
  description: string | null;
  categoryName: string;
  points: number;
  isActive: boolean;
};

/**
 * Renders the family's existing TaskDefinitions in preset-picker-style cards
 * (grouped by category, each row with a per-row "Done" button that credits
 * points against the existing definition — no duplicate row).
 *
 * Checkboxes enable multi-select bulk delete. A sticky bottom bar surfaces
 * the count + Delete + Cancel actions once anything is checked; the same
 * pattern as the preset picker so the UX stays consistent.
 */
export function UserTasksPicker({
  tasks,
  completeAction,
  undoAction,
  deleteAction,
  assignAction,
  mode = "parent",
}: {
  tasks: UserTaskRow[];
  completeAction: (
    taskDefinitionId: string,
  ) => Promise<
    { ok: true; pointsAwarded: number; assignedTaskId: string } | { ok: false; error: string }
  >;
  // Rolls back a credit fired by completeAction (the toast's Undo).
  undoAction?: (
    assignedTaskId: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  deleteAction?: (
    taskIds: string[],
  ) => Promise<{ ok: true; deleted: number } | { ok: false; error: string }>;
  assignAction?: (
    taskIds: string[],
  ) => Promise<{ ok: true; assigned: number } | { ok: false; error: string }>;
  // "child" mode hides the multi-select checkboxes and the bulk action bar:
  // a child can only credit existing tasks, not delete or bulk-assign them.
  mode?: "parent" | "child";
}) {
  const t = useT();
  const selectable = mode === "parent";
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [completing, setCompleting] = useState<Record<string, boolean>>({});
  const [completed, setCompleted] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, UserTaskRow[]>();
    for (const row of tasks) {
      if (!map.has(row.categoryName)) map.set(row.categoryName, []);
      map.get(row.categoryName)!.push(row);
    }
    return Array.from(map.entries());
  }, [tasks]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(rows: UserTaskRow[]) {
    const allSelected = rows.every((r) => selected.has(r.id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of rows) {
        if (allSelected) next.delete(r.id);
        else next.add(r.id);
      }
      return next;
    });
  }

  function creditOne(task: UserTaskRow) {
    if (completing[task.id] || completed[task.id] !== undefined) return;
    setError(null);
    setCompleting((prev) => ({ ...prev, [task.id]: true }));
    start(async () => {
      const res = await completeAction(task.id);
      if (!res.ok) {
        setError(res.error);
        setCompleting((prev) => ({ ...prev, [task.id]: false }));
        return;
      }
      setCompleted((prev) => ({ ...prev, [task.id]: res.pointsAwarded }));
      setCompleting((prev) => ({ ...prev, [task.id]: false }));
      if (undoAction) {
        const creditedId = res.assignedTaskId;
        toast({
          message: `+${res.pointsAwarded} ${t.app.pointsShort}`,
          action: {
            label: t.app.undo,
            run: async () => {
              await undoAction(creditedId);
              setCompleted((prev) => {
                const next = { ...prev };
                delete next[task.id];
                return next;
              });
              router.refresh();
            },
          },
          duration: 5000,
        });
      }
      router.refresh();
    });
  }

  function submitDelete() {
    if (!deleteAction) return;
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirmDelete) {
      // First click arms the confirm; second click commits. Avoids a
      // window.confirm() dialog (per project convention).
      setConfirmDelete(true);
      return;
    }
    setError(null);
    start(async () => {
      const res = await deleteAction(ids);
      if (!res.ok) {
        setError(res.error);
        setConfirmDelete(false);
        return;
      }
      setSelected(new Set());
      setConfirmDelete(false);
      router.refresh();
    });
  }

  function submitAssign() {
    if (!assignAction) return;
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setError(null);
    start(async () => {
      const res = await assignAction(ids);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSelected(new Set());
      setConfirmDelete(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {grouped.map(([category, rows]) => {
          const allSelected = rows.every((r) => selected.has(r.id));
          return (
            <Card key={category}>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">{category}</h3>
                  {selectable ? (
                    <button
                      type="button"
                      onClick={() => toggleGroup(rows)}
                      className="text-xs font-medium text-brand-700 hover:text-brand-800"
                    >
                      {allSelected ? t.tasks.presetsDeselectAll : t.tasks.presetsSelectAll}
                    </button>
                  ) : null}
                </div>
                <ul className="divide-y divide-slate-100">
                  {rows.map((task) => {
                    const isCompleting = !!completing[task.id];
                    const awarded = completed[task.id];
                    const isDone = awarded !== undefined;
                    const isChecked = selected.has(task.id);
                    return (
                      <li
                        key={task.id}
                        className={
                          "py-2 flex items-center gap-3 " + (isDone ? "opacity-60" : "")
                        }
                      >
                        {selectable ? (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelected(task.id)}
                            aria-label={task.title}
                            className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
                          />
                        ) : null}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 break-words">
                            {task.title}
                          </p>
                          {task.description ? (
                            <p className="text-xs text-slate-500 break-words">
                              {task.description}
                            </p>
                          ) : null}
                          <p className="text-xs text-slate-400">{task.categoryName}</p>
                        </div>
                        <span className="shrink-0 w-12 text-right text-sm tabular-nums text-slate-700">
                          {task.points}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant={isDone ? "secondary" : "success"}
                          onClick={() => creditOne(task)}
                          disabled={isCompleting || isDone || !task.isActive}
                          aria-label={`${t.tasks.presetsCreditNow} — ${task.title}`}
                        >
                          {isDone
                            ? `+${awarded}`
                            : isCompleting
                              ? t.app.loading
                              : `✓ ${t.tasks.presetsCreditNow}`}
                        </Button>
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

      {selectable && selected.size > 0 ? (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
          <span className="text-sm text-slate-600">
            {t.tasks.presetsSelected.replace("{count}", String(selected.size))}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSelected(new Set());
                setConfirmDelete(false);
              }}
            >
              {t.app.cancel}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={submitAssign}
              disabled={pending || confirmDelete}
            >
              {t.tasks.bulkAssign} ({selected.size})
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={submitDelete}
              disabled={pending}
            >
              {confirmDelete
                ? `${t.app.confirm}: ${t.app.delete}`
                : `${t.app.delete} (${selected.size})`}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
