import Link from "next/link";
import { requireParent } from "@/lib/auth/permissions";
import { listTaskDefinitions } from "@/lib/services/tasks";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  TasksListSelectable,
  type TaskRow,
} from "@/components/parent/tasks-list-selectable";
import { t } from "@/lib/i18n/ru";

export const dynamic = "force-dynamic";

export default async function ParentTasksPage() {
  await requireParent();
  const tasks = await listTaskDefinitions({ includeInactive: true });

  // Bulk-assign only makes sense when there's exactly one active child — that
  // matches our shared-trust / single-kid deployment (see memory:
  // user_family_context). For larger families we fall back to the per-task
  // assign panel on the detail page.
  const activeKidCount = await prisma.childProfile.count({
    where: { user: { isActive: true } },
  });
  const canBulkAssign = activeKidCount === 1;

  const rows: TaskRow[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    isActive: task.isActive,
    points: task.points,
    categoryName: task.category.name,
    recurrenceType: task.recurrenceType,
    createdByRole: task.createdBy?.role ?? null,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{t.tasks.list}</h1>
        <div className="flex gap-2">
          <Link href="/parent/tasks/presets">
            <Button size="sm" variant="secondary">
              {t.tasks.presets}
            </Button>
          </Link>
          <Link href="/parent/tasks/new">
            <Button size="sm">{t.tasks.new}</Button>
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={t.app.empty} />
      ) : (
        <TasksListSelectable tasks={rows} canBulkAssign={canBulkAssign} />
      )}
    </div>
  );
}
