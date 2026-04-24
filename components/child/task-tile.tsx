"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskStatusPill } from "@/components/shared/status-pill";
import { t } from "@/lib/i18n/ru";
import { formatPoints } from "@/lib/utils/format";
import { markTaskCompleteAction } from "@/app/(app)/child/tasks/actions";

export type ChildTaskTileData = {
  id: string;
  title: string;
  category: string;
  points: number;
  status: "ASSIGNED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "CANCELED";
  rejectionReason?: string | null;
};

export function TaskTile({ task }: { task: ChildTaskTileData }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onDone() {
    start(async () => {
      const res = await markTaskCompleteAction(task.id);
      if (!res.ok) alert(res.error);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 truncate">{task.title}</p>
          <p className="text-xs text-slate-500 truncate">{task.category}</p>
          {task.status === "REJECTED" && task.rejectionReason ? (
            <p className="text-xs text-danger-700 mt-1">{task.rejectionReason}</p>
          ) : null}
        </div>
        <div className="text-right shrink-0">
          <p className="text-brand-700 font-semibold">+{formatPoints(task.points)}</p>
          <div className="mt-1">
            {task.status === "ASSIGNED" ? (
              <Button onClick={onDone} disabled={pending} size="sm" variant="success">
                {t.tasks.markDone}
              </Button>
            ) : (
              <TaskStatusPill status={task.status} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
