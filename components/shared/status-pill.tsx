"use client";

import { Badge } from "@/components/ui/badge";
import type { AssignedTaskStatus, RewardRequestStatus } from "@prisma/client";
import { useT } from "@/lib/i18n/client";

const taskTone: Record<AssignedTaskStatus, "neutral" | "warning" | "success" | "danger"> = {
  ASSIGNED: "neutral",
  PENDING_APPROVAL: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELED: "neutral",
};

export function TaskStatusPill({ status }: { status: AssignedTaskStatus }) {
  const t = useT();
  return <Badge tone={taskTone[status]}>{t.tasks.status[status]}</Badge>;
}

const rewardTone: Record<RewardRequestStatus, "neutral" | "warning" | "success" | "danger"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELED: "neutral",
};

export function RewardStatusPill({ status }: { status: RewardRequestStatus }) {
  const t = useT();
  // The shared rewards.pending key only covers PENDING; the other states use
  // task-status labels, which match the intent ("Received" / "Refused" etc).
  const label =
    status === "PENDING"
      ? t.rewards.pending
      : status === "APPROVED"
        ? t.tasks.status.APPROVED
        : status === "REJECTED"
          ? t.tasks.status.REJECTED
          : t.tasks.status.CANCELED;
  return <Badge tone={rewardTone[status]}>{label}</Badge>;
}
