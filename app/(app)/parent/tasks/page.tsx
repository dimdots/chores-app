import Link from "next/link";
import { requireParent } from "@/lib/auth/permissions";
import { listCategories } from "@/lib/services/categories";
import { listTaskDefinitions } from "@/lib/services/tasks";
import { DEFAULT_TASK_PRESETS } from "@/config/defaults";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PresetPicker, type ResolvedPreset } from "@/components/parent/preset-picker";
import {
  UserTasksPicker,
  type UserTaskRow,
} from "@/components/parent/user-tasks-picker";
import {
  createTasksFromPresetsAction,
  completePresetAsParentAction,
  creditExistingTaskAsParentAction,
  deleteTasksBulkAction,
  assignTasksBulkAction,
  uncreditTaskAction,
} from "@/app/(app)/parent/tasks/actions";
import { getT, getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

// Russian families see the curated preset picker. Non-Russian families
// see their own task list rendered in the same card-row style with a
// per-row "Done" button — quick credit without going through the dashboard.
export default async function ParentTasksPage() {
  const t = getT();
  const locale = getLocale();
  const s = await requireParent();
  const categories = await listCategories(s.familyId, { activeOnly: true });

  const showPresets = locale === "ru";

  if (showPresets) {
    const byName = new Map(categories.map((c) => [c.name, c]));
    const fallback = categories[0];

    const resolved: ResolvedPreset[] = DEFAULT_TASK_PRESETS.flatMap((p, idx) => {
      const cat = byName.get(p.categoryName) ?? fallback;
      if (!cat) return [];
      return [
        {
          key: `${p.group}::${p.title}::${idx}`,
          title: p.title,
          description: p.description,
          group: p.group,
          categoryId: cat.id,
          categoryName: cat.name,
          defaultPoints: p.points,
        },
      ];
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">{t.tasks.presetsTitle}</h1>
          <Link href="/parent/tasks/new">
            <Button size="sm">{t.tasks.new}</Button>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t.tasks.presets}</CardTitle>
          </CardHeader>
          <CardContent>
            <PresetPicker
              presets={resolved}
              action={createTasksFromPresetsAction}
              completeAction={completePresetAsParentAction}
              undoAction={uncreditTaskAction}
              redirectTo="/parent/dashboard"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Non-Russian: render the family's user-defined tasks in preset-style cards.
  const defs = await listTaskDefinitions(s.familyId, { includeInactive: true });
  const rows: UserTaskRow[] = defs.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    categoryName: d.category.name,
    points: d.points,
    isActive: d.isActive,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{t.tasks.list}</h1>
        <Link href="/parent/tasks/new">
          <Button size="sm">{t.tasks.new}</Button>
        </Link>
      </div>
      {rows.length === 0 ? (
        <EmptyState title={t.tasks.todoEmpty} description={t.tasks.new} />
      ) : (
        <UserTasksPicker
          tasks={rows}
          completeAction={creditExistingTaskAsParentAction}
          undoAction={uncreditTaskAction}
          deleteAction={deleteTasksBulkAction}
          assignAction={assignTasksBulkAction}
        />
      )}
    </div>
  );
}
