import Link from "next/link";
import { requireChild } from "@/lib/auth/permissions";
import { listCategories } from "@/lib/services/categories";
import { DEFAULT_TASK_PRESETS } from "@/config/defaults";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PresetPicker, type ResolvedPreset } from "@/components/parent/preset-picker";
import {
  createChildTasksFromPresetsAction,
  completePresetAsChildAction,
} from "@/app/(app)/child/tasks/actions";
import { t } from "@/lib/i18n/ru";

export const dynamic = "force-dynamic";

// "Tasks" tab on the kid side is the preset picker — that's where the kid
// either credits points for an ad-hoc thing they just did ("Готово") or pushes
// a preset onto their own todo queue (bulk-add at the bottom). The previous
// today's-todo list lives on the dashboard ("Сегодня") so we don't need a
// duplicate here. Custom (non-preset) tasks are still creatable via the
// "Новое" link in the header.
export default async function ChildTasks() {
  await requireChild();
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
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{t.tasks.presetsTitle}</h1>
        <Link href="/child/tasks/new">
          <Button size="sm">{t.tasks.childNew}</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.tasks.presets}</CardTitle>
        </CardHeader>
        <CardContent>
          <PresetPicker
            presets={resolved}
            action={createChildTasksFromPresetsAction}
            completeAction={completePresetAsChildAction}
            redirectTo="/child/dashboard"
          />
        </CardContent>
      </Card>
    </div>
  );
}
