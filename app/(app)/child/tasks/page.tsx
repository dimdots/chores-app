import Link from "next/link";
import { requireChild } from "@/lib/auth/permissions";
import { listCategories } from "@/lib/services/categories";
import { DEFAULT_TASK_PRESETS } from "@/config/defaults";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PresetPicker, type ResolvedPreset } from "@/components/parent/preset-picker";
import {
  createChildTasksFromPresetsAction,
  completePresetAsChildAction,
} from "@/app/(app)/child/tasks/actions";
import { getT, getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

// Child "Tasks" tab mirrors the parent one. Preset catalog is Russian-only;
// non-Russian families just see the "Add your own task" CTA.
export default async function ChildTasks() {
  const t = getT();
  const locale = getLocale();
  const s = await requireChild();
  const categories = await listCategories(s.familyId, { activeOnly: true });

  const showPresets = locale === "ru";

  const byName = new Map(categories.map((c) => [c.name, c]));
  const fallback = categories[0];

  const resolved: ResolvedPreset[] = showPresets
    ? DEFAULT_TASK_PRESETS.flatMap((p, idx) => {
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
      })
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">
          {showPresets ? t.tasks.presetsTitle : t.tasks.list}
        </h1>
        <Link href="/child/tasks/new">
          <Button size="sm">{t.tasks.childNew}</Button>
        </Link>
      </div>

      {showPresets ? (
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
      ) : (
        <EmptyState
          title={t.tasks.todoEmpty}
          description={t.tasks.childNew}
        />
      )}
    </div>
  );
}
