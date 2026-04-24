"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteTaskButton } from "@/components/parent/delete-task-button";
import { t } from "@/lib/i18n/ru";

/**
 * Danger-zone card at the bottom of the task edit page. Splits the hard
 * delete away from the regular save form so a parent has to make a deliberate
 * second click to remove a task.
 */
export function DeleteTaskCard({
  taskId,
  title,
}: {
  taskId: string;
  title: string;
}) {
  const router = useRouter();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-danger-700">{t.tasks.delete}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-500">
          {t.tasks.confirmDelete.replace("{title}", title)}
        </p>
        <DeleteTaskButton
          taskId={taskId}
          title={title}
          variant="full"
          onDeleted={() => router.push("/parent/tasks")}
        />
      </CardContent>
    </Card>
  );
}
