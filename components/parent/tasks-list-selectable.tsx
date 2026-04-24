"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteTaskButton } from "@/components/parent/delete-task-button";
import { t } from "@/lib/i18n/ru";
import { formatPoints } from "@/lib/utils/format";
import { assignTasksBulkAction } from "@/app/(app)/parent/tasks/actions";

export type TaskRow = {
  id: string;
  title: string;
  isActive: boolean;
  points: number;
  categoryName: string;
  recurrenceType: "NONE" | "DAILY" | "WEEKLY" | "WEEKDAYS";
  createdByRole: "PARENT" | "CHILD" | null;
};

function recurrenceLabel(kind: string): string {
  switch (kind) {
    case "DAILY":
      return t.tasks.recurrenceDaily;
    case "WEEKLY":
      return t.tasks.recurrenceWeekly;
    case "WEEKDAYS":
      return t.tasks.recurrenceWeekdays;
    default:
      return t.tasks.recurrenceNone;
  }
}

export function TasksListSelectable({
  tasks,
  canBulkAssign,
}: {
  tasks: TaskRow[];
  /**
   * True when the family has exactly one active child. Without that we can't
   * auto-pick a target for bulk-assign, so the checkboxes are hidden entirely
   * (the parent uses the per-task assign panel instead).
   */
  canBulkAssign: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Only active tasks can be assigned — archived ones shouldn't accept new
  // AssignedTask rows. Filter them out of the selection pool entirely so the
  // checkbox never appears next to an archived row.
  const assignable = useMemo(() => tasks.filter((t) => t.isActive), [tasks]);
  const allSelected =
    assignable.length > 0 && assignable.every((t) => selected.has(t.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (assignable.every((t) => prev.has(t.id))) return new Set();
      return new Set(assignable.map((t) => t.id));
    });
  }

  function submit() {
    setError(null);
    const ids = Array.from(selected);
    if (ids.length === 0) {
      setError(t.tasks.bulkAssignNoneSelected);
      return;
    }
    start(async () => {
      const res = await assignTasksBulkAction(ids);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {canBulkAssign && assignable.length > 0 ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <button
            type="button"
            onClick={toggleAll}
            className="text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            {allSelected ? t.tasks.deselectAll : t.tasks.selectAll}
          </button>
          <span className="text-sm text-slate-600">
            {t.tasks.presetsSelected.replace("{count}", String(selected.size))}
          </span>
        </div>
      ) : null}

      <div className="space-y-2">
        {tasks.map((task) => {
          const selectable = canBulkAssign && task.isActive;
          const isChecked = selected.has(task.id);
          return (
            <Card key={task.id} className="hover:shadow-float transition-shadow">
              <CardContent className="flex items-center gap-3">
                {selectable ? (
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(task.id)}
                    aria-label={task.title}
                    className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
                  />
                ) : null}
                <Link
                  href={`/parent/tasks/${task.id}`}
                  className="flex-1 min-w-0 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 truncate">{task.title}</p>
                      {!task.isActive ? (
                        <Badge tone="neutral">{t.tasks.inactive}</Badge>
                      ) : null}
                      {task.createdByRole === "CHILD" ? (
                        <Badge tone="brand">{t.tasks.createdByChild}</Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-500">
                      {task.categoryName} · {recurrenceLabel(task.recurrenceType)}
                    </p>
                  </div>
                  <span className="shrink-0 text-brand-700 font-semibold">
                    +{formatPoints(task.points)}
                  </span>
                </Link>
                <DeleteTaskButton taskId={task.id} title={task.title} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error ? <p className="text-sm text-danger-700">{error}</p> : null}

      {canBulkAssign && selected.size > 0 ? (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
          <span className="text-sm text-slate-600">
            {t.tasks.presetsSelected.replace("{count}", String(selected.size))}
          </span>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? t.app.loading : t.tasks.bulkAssign}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
