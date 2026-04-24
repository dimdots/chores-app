import { requireParent } from "@/lib/auth/permissions";
import { listCategories } from "@/lib/services/categories";
import { TaskForm } from "@/components/parent/task-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n/ru";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  await requireParent();
  const categories = await listCategories({ activeOnly: true });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.tasks.new}</CardTitle>
      </CardHeader>
      <CardContent>
        <TaskForm categories={categories} />
      </CardContent>
    </Card>
  );
}
