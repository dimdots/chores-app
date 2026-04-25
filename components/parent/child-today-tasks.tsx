"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryGroup } from "@/components/shared/category-group";
import { TaskStatusPill } from "@/components/shared/status-pill";
import { t } from "@/lib/i18n/ru";
import { formatPoints } from "@/lib/utils/format";

export type ParentTodayTaskRow = {
  id: string;
  title: string;
  category: string;
  points: number;
  status: "ASSIGNED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "CANCELED";
};

/**
 * Read-only per-child today's-tasks card on the parent dashboard. The parent
 * doesn't mark tasks done from here (kid does that), so each row is just a
 * link into the assigned-task detail. Grouped by category and collapsible —
 * scope is per-child so collapsing one kid's "Домашние дела" doesn't cascade
 * into another child's section.
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
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 break-words">
                        {task.title}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {task.category}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-brand-700 font-semibold">
                        +{formatPoints(task.points)}
                      </p>
                      <div className="mt-1">
                        <TaskStatusPill status={task.status} />
                      </div>
                    </div>
                  </div>
                ))}
              </CategoryGroup>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
