import { requireChild } from "@/lib/auth/permissions";
import { listCategories } from "@/lib/services/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";
import { ChildTaskForm } from "./child-task-form";

export const dynamic = "force-dynamic";

export default async function NewChildTaskPage() {

  const t = getT();
  const s = await requireChild();
  const categories = await listCategories(s.familyId, { activeOnly: true });

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
