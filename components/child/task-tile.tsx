"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskStatusPill } from "@/components/shared/status-pill";
import { useT, useLocale } from "@/lib/i18n/client";
import { formatPoints } from "@/lib/utils/format";
import { useToast } from "@/components/ui/toast";
import {
  markTaskCompleteAction,
  uncreditTaskAction,
} from "@/app/(app)/child/tasks/actions";

export type ChildTaskTileData = {
  id: string;
  title: string;
  category: string;
  points: number;
  status: "ASSIGNED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "CANCELED";
  rejectionReason?: string | null;
};

export function TaskTile({ task }: { task: ChildTaskTileData }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDone() {
    setError(null);
    start(async () => {
      const res = await markTaskCompleteAction(task.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const creditedId = res.assignedTaskId;
      toast({
        message: `+${res.pointsAwarded} ${t.app.pointsShort}`,
        action: {
          label: t.app.undo,
          run: async () => {
            await uncreditTaskAction(creditedId);
            router.refresh();
          },
        },
        duration: 5000,
      });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 break-words">{task.title}</p>
          <p className="text-xs text-slate-500 truncate">{task.category}</p>
          {task.status === "REJECTED" && task.rejectionReason ? (
            <p className="text-xs text-danger-700 mt-1">{task.rejectionReason}</p>
          ) : null}
          {error ? <p className="text-xs text-danger-700 mt-1">{error}</p> : null}
        </div>
        <div className="text-right shrink-0">
          <p className="text-brand-700 font-semibold">+{formatPoints(task.points, locale)}</p>
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
