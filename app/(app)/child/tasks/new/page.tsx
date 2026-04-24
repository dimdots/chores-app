import { requireChild } from "@/lib/auth/permissions";
import { listCategories } from "@/lib/services/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n/ru";
import { ChildTaskForm } from "./child-task-form";

export const dynamic = "force-dynamic";

export default async function NewChildTaskPage() {
  await requireChild();
  const categories = await listCategories({ activeOnly: true });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.tasks.childNewTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChildTaskForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
      </CardContent>
    </Card>
  );
}
