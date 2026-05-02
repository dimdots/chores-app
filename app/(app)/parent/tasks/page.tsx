import Link from "next/link";
import { requireParent } from "@/lib/auth/permissions";
import { listCategories } from "@/lib/services/categories";
import { DEFAULT_TASK_PRESETS } from "@/config/defaults";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PresetPicker, type ResolvedPreset } from "@/components/parent/preset-picker";
import {
  createTasksFromPresetsAction,
  completePresetAsParentAction,
} from "@/app/(app)/parent/tasks/actions";
import { t } from "@/lib/i18n/ru";

export const dynamic = "force-dynamic";

// "Tasks" tab on the parent side is the preset picker, same as on the kid
// side — credit a preset instantly ("Готово") or bulk-add to today's queue.
// The detail / edit / archive flow remains accessible via /parent/tasks/[id]
// when the parent navigates from the dashboard or activity feed; the Tasks
// landing page is now the action-oriented view.
export default async function ParentTasksPage() {
  await requireParent();
  const categories = await listCategories({ activeOnly: true });

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
            redirectTo="/parent/dashboard"
          />
        </CardContent>
      </Card>
    </div>
  );
}
