import { Badge } from "@/components/ui/badge";
import type { AssignedTaskStatus, RewardRequestStatus } from "@prisma/client";
import { t } from "@/lib/i18n/ru";

const taskTone: Record<AssignedTaskStatus, "neutral" | "warning" | "success" | "danger"> = {
  ASSIGNED: "neutral",
  PENDING_APPROVAL: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELED: "neutral",
};

export function TaskStatusPill({ status }: { status: AssignedTaskStatus }) {
  return <Badge tone={taskTone[status]}>{t.tasks.status[status]}</Badge>;
}

const rewardTone: Record<RewardRequestStatus, "neutral" | "warning" | "success" | "danger"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELED: "neutral",
};

export function RewardStatusPill({ status }: { status: RewardRequestStatus }) {
  const label =
    status === "PENDING"
      ? t.rewards.pending
      : status === "APPROVED"
        ? "Получено"
        : status === "REJECTED"
          ? "Отклонено"
          : "Отменено";
  return <Badge tone={rewardTone[status]}>{label}</Badge>;
}
