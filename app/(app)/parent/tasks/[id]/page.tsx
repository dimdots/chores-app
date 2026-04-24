import { notFound } from "next/navigation";
import { requireParent } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { listCategories } from "@/lib/services/categories";
import { TaskForm } from "@/components/parent/task-form";
import { DeleteTaskCard } from "./delete-task-card";
import { AssignTaskPanel } from "./assign-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n/ru";

export const dynamic = "force-dynamic";

export default async function EditTaskPage({ params }: { params: { id: string } }) {
  await requireParent();
  const [def, categories, children] = await Promise.all([
    prisma.taskDefinition.findUnique({ where: { id: params.id } }),
    listCategories({ activeOnly: true }),
    prisma.childProfile.findMany({
      include: { user: true },
      orderBy: { displayName: "asc" },
    }),
  ]);
  if (!def) notFound();

  let recurrenceDays: number[] | null = null;
  if (def.recurrenceDays) {
    try {
      const parsed: unknown = JSON.parse(def.recurrenceDays);
      if (Array.isArray(parsed)) {
        recurrenceDays = parsed.filter((n): n is number => typeof n === "number");
      }
    } catch {
      recurrenceDays = null;
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.tasks.edit}</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskForm
            categories={categories}
            initial={{
              id: def.id,
              title: def.title,
              description: def.description,
              categoryId: def.categoryId,
              points: def.points,
              recurrenceType: def.recurrenceType,
              recurrenceDays,
              isActive: def.isActive,
            }}
          />
        </CardContent>
      </Card>

      <AssignTaskPanel taskId={def.id} children={children} />

      <DeleteTaskCard taskId={def.id} title={def.title} />
    </div>
  );
}
