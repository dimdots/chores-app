"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryGroup } from "@/components/shared/category-group";
import { TaskStatusPill } from "@/components/shared/status-pill";
import { t } from "@/lib/i18n/ru";
import { formatPoints } from "@/lib/utils/format";
import { markTaskCompleteByParentAction } from "@/app/(app)/parent/tasks/actions";

export type ParentTodayTaskRow = {
  id: string;
  title: string;
  category: string;
  points: number;
  status: "ASSIGNED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "CANCELED";
};

/**
 * Per-child today's-tasks card on the parent dashboard. Grouped by category
 * and collapsible — scope is per-child so collapsing one kid's "Домашние
 * дела" doesn't cascade into another child's section. Each ASSIGNED row
 * exposes a "Готово!" button so the parent can check things off without
 * switching to the kid's account (shared-trust pivot — either side may
 * record completion).
 */
export function ChildTodayTasks({
  childId,
  childName,
  tasks,
}: {
  childId: string;
  childName: string;
  tasks: ParentTodayTaskRow[];
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, ParentTodayTaskRow[]>();
    for (const task of tasks) {
      if (!map.has(task.category)) map.set(task.category, []);
      map.get(task.category)!.push(task);
    }
    return Array.from(map.entries());
  }, [tasks]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {childName} · {t.parentDashboard.tasksToday}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-500">{t.parentDashboard.noTasksToday}</p>
        ) : (
          <div className="space-y-4">
            {grouped.map(([category, rows]) => (
              <CategoryGroup
                key={category}
                scope={`parent-dashboard-today-${childId}`}
                category={category}
                count={rows.length}
              >
                {rows.map((task) => (
                  <ParentTaskRow key={task.id} task={task} />
                ))}
              </CategoryGroup>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ParentTaskRow({ task }: { task: ParentTodayTaskRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDone() {
    setError(null);
    start(async () => {
      const res = await markTaskCompleteByParentAction(task.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 break-words">{task.title}</p>
          <p className="text-xs text-slate-500 truncate">{task.category}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-brand-700 font-semibold">
            +{formatPoints(task.points)}
          </p>
          <div className="mt-1">
            {task.status === "ASSIGNED" ? (
              <Button onClick={onDone} disabled={pending} size="sm" variant="success">
                {t.tasks.markDone}
              </Button>
            ) : (
              <TaskStatusPill status={task.status} />
            )}
          </div>
        </div>
      </div>
      {error ? <p className="mt-1 text-xs text-danger-700">{error}</p> : null}
    </div>
  );
}
