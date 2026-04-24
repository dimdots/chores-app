import Link from "next/link";
import { requireParent } from "@/lib/auth/permissions";
import { listTaskDefinitions } from "@/lib/services/tasks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteTaskButton } from "@/components/parent/delete-task-button";
import { t } from "@/lib/i18n/ru";
import { formatPoints } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function ParentTasksPage() {
  await requireParent();
  const tasks = await listTaskDefinitions({ includeInactive: true });

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

      {tasks.length === 0 ? (
        <EmptyState title={t.app.empty} />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-float transition-shadow">
              <CardContent className="flex items-center gap-3">
                <Link
                  href={`/parent/tasks/${task.id}`}
                  className="flex-1 min-w-0 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 truncate">{task.title}</p>
                      {!task.isActive ? <Badge tone="neutral">{t.tasks.inactive}</Badge> : null}
                      {task.createdBy?.role === "CHILD" ? (
                        <Badge tone="brand">{t.tasks.createdByChild}</Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-500">
                      {task.category.name} · {recurrenceLabel(task.recurrenceType)}
                    </p>
                  </div>
                  <span className="shrink-0 text-brand-700 font-semibold">
                    +{formatPoints(task.points)}
                  </span>
                </Link>
                <DeleteTaskButton taskId={task.id} title={task.title} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

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
