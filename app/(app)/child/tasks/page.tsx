import Link from "next/link";
import { requireChild } from "@/lib/auth/permissions";
import { listAssignedTasksForChildToday } from "@/lib/services/tasks";
import { generateRecurringTasksIfNeeded } from "@/lib/services/tasks";
import { TaskTileGroup } from "@/components/child/task-tile-group";
import type { ChildTaskTileData } from "@/components/child/task-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/ru";

export const dynamic = "force-dynamic";

export default async function ChildTasks() {
  const s = await requireChild();
  await generateRecurringTasksIfNeeded(s.childId);
  const tasks = await listAssignedTasksForChildToday(s.childId);

  const toTile = (task: (typeof tasks)[number]): ChildTaskTileData => ({
    id: task.id,
    title: task.taskDefinition.title,
    category: task.taskDefinition.category.name,
    points: task.taskDefinition.points,
    status: task.status,
    rejectionReason: task.rejectionReason,
  });

  // "To do" = anything not yet settled. PENDING_APPROVAL is legacy (the pivot
  // auto-approves), but we keep it grouped with "to do" so any old rows from
  // before the migration don't vanish into a gap.
  const todo = tasks
    .filter((task) => task.status === "ASSIGNED" || task.status === "PENDING_APPROVAL")
    .map(toTile);
  // "Done today" = what the kid has already completed. Recurring tasks keep
  // scheduledDate = today; unscheduled one-offs are filtered in the service
  // to only include items approved today (no cross-day bleed).
  const done = tasks.filter((task) => task.status === "APPROVED").map(toTile);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{t.tasks.list}</h1>
        <Link href="/child/tasks/new">
          <Button size="sm">{t.tasks.childNew}</Button>
        </Link>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
          {t.tasks.todoHeading}
        </h2>
        {todo.length === 0 ? (
          <EmptyState title={t.tasks.todoEmpty} />
        ) : (
          <TaskTileGroup scope="child-todo" tasks={todo} />
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
          {t.tasks.doneTodayHeading}
        </h2>
        {done.length === 0 ? (
          <EmptyState title={t.tasks.doneTodayEmpty} />
        ) : (
          <TaskTileGroup scope="child-done" tasks={done} dimmed />
        )}
      </section>
    </div>
  );
}
