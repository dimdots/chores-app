import { requireChild } from "@/lib/auth/permissions";
import { listCategories } from "@/lib/services/categories";
import { DEFAULT_TASK_PRESETS } from "@/config/defaults";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PresetPicker, type ResolvedPreset } from "@/components/parent/preset-picker";
import { createChildTasksFromPresetsAction } from "@/app/(app)/child/tasks/actions";
import { t } from "@/lib/i18n/ru";

export const dynamic = "force-dynamic";

export default async function ChildTaskPresetsPage() {
  await requireChild();
  const categories = await listCategories({ activeOnly: true });

  // Resolve each preset's textual categoryName to a concrete categoryId. If a
  // category was archived we fall back to the first active category so the
  // preset still lands somewhere sensible rather than exploding in the server
  // action's validator.
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
    <Card>
      <CardHeader>
        <CardTitle>{t.tasks.presetsTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <PresetPicker
          presets={resolved}
          action={createChildTasksFromPresetsAction}
          redirectTo="/child/tasks"
        />
      </CardContent>
    </Card>
  );
}
