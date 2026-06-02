import { prisma } from "@/lib/db/prisma";
import type { AssignedTaskStatus, Prisma, TaskDefinition } from "@prisma/client";
import {
  taskDefinitionCreateSchema,
  taskDefinitionUpdateSchema,
  assignTaskSchema,
} from "@/lib/validators/task";
import { logEvent } from "./activity-log";
import { startOfLocalDay, localWeekday } from "@/lib/utils/dates";
import { applyPointsDelta } from "./points";
import { updateStreakAfterTaskApproval } from "./streaks";
import { t } from "@/lib/i18n/ru";

// ---------- Definitions ----------

export async function createTaskDefinition(
  familyId: string,
  input: unknown,
  actorUserId: string,
) {
  const parsed = taskDefinitionCreateSchema.safeParse(input);
  if (!parsed.success) throw new Error(t.errors.validation);
  const data = parsed.data;

  // Defense: the category must belong to the same family — otherwise a
  // forged categoryId from another tenant slips through the FK.
  const cat = await prisma.taskCategory.findFirst({
    where: { id: data.categoryId, familyId },
    select: { id: true },
  });
  if (!cat) throw new Error(t.errors.validation);

  return prisma.taskDefinition.create({
    data: {
      familyId,
      title: data.title,
      description: data.description ?? null,
      categoryId: data.categoryId,
      points: data.points,
      recurrenceType: data.recurrenceType,
      recurrenceDays:
        data.recurrenceType === "WEEKDAYS" && data.recurrenceDays
          ? JSON.stringify(data.recurrenceDays)
          : null,
      createdById: actorUserId,
      isActive: true,
    },
  });
}

export async function updateTaskDefinition(familyId: string, input: unknown) {
  const parsed = taskDefinitionUpdateSchema.safeParse(input);
  if (!parsed.success) throw new Error(t.errors.validation);
  const { id, recurrenceDays, ...rest } = parsed.data;

  const data: Prisma.TaskDefinitionUpdateInput = { ...rest };
  if (recurrenceDays !== undefined) {
    data.recurrenceDays = recurrenceDays ? JSON.stringify(recurrenceDays) : null;
  }
  if (rest.recurrenceType && rest.recurrenceType !== "WEEKDAYS") {
    data.recurrenceDays = null;
  }
  const res = await prisma.taskDefinition.updateMany({
    where: { id, familyId },
    data,
  });
  if (res.count === 0) throw new Error(t.errors.taskNotFound);
  return prisma.taskDefinition.findUnique({ where: { id } });
}

export async function archiveTaskDefinition(familyId: string, id: string) {
  const res = await prisma.taskDefinition.updateMany({
    where: { id, familyId },
    data: { isActive: false },
  });
  if (res.count === 0) throw new Error(t.errors.taskNotFound);
  return prisma.taskDefinition.findUnique({ where: { id } });
}

export async function restoreTaskDefinition(familyId: string, id: string) {
  const res = await prisma.taskDefinition.updateMany({
    where: { id, familyId },
    data: { isActive: true },
  });
  if (res.count === 0) throw new Error(t.errors.taskNotFound);
  return prisma.taskDefinition.findUnique({ where: { id } });
}

/**
 * Hard-delete a task definition and every AssignedTask row that references it.
 * ActivityLog entries are intentionally NOT touched — they stay around as the
 * historical record of points earned (balances were already applied).
 */
export async function deleteTaskDefinition(familyId: string, id: string) {
  const def = await prisma.taskDefinition.findFirst({
    where: { id, familyId },
    select: { id: true },
  });
  if (!def) throw new Error(t.errors.taskNotFound);
  return prisma.$transaction([
    prisma.assignedTask.deleteMany({ where: { taskDefinitionId: id } }),
    prisma.taskDefinition.delete({ where: { id } }),
  ]);
}

// ---------- Assignments ----------

export async function assignTaskToChild(familyId: string, input: unknown) {
  const parsed = assignTaskSchema.safeParse(input);
  if (!parsed.success) throw new Error(t.errors.validation);
  const { taskDefinitionId, childId, dueDate, scheduledDate } = parsed.data;
  const def = await prisma.taskDefinition.findFirst({
    where: { id: taskDefinitionId, familyId },
  });
  if (!def || !def.isActive) throw new Error(t.errors.taskNotFound);
  const child = await prisma.childProfile.findFirst({
    where: { id: childId, user: { familyId } },
  });
  if (!child) throw new Error(t.errors.childNotFound);

  const sched = scheduledDate ?? startOfLocalDay();
  try {
    return await prisma.assignedTask.create({
      data: {
        taskDefinitionId,
        childId,
        dueDate: dueDate ?? null,
        scheduledDate: sched,
        status: "ASSIGNED",
      },
    });
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002") {
      const existing = await prisma.assignedTask.findFirst({
        where: { taskDefinitionId, childId, scheduledDate: sched },
      });
      return existing;
    }
    throw err;
  }
}

// ---------- Recurring generator ----------

/**
 * Idempotently generate today's recurring AssignedTask rows for one child.
 * Call this from dashboards to materialize tasks lazily — no cron needed.
 * Scoped to the child's family so cross-family task definitions can't leak
 * in via this path.
 */
export async function generateRecurringTasksIfNeeded(childId: string, now: Date = new Date()) {
  const today = startOfLocalDay(now);
  const weekday = localWeekday(now); // 0..6 Sun..Sat

  const child = await prisma.childProfile.findUnique({
    where: { id: childId },
    select: { user: { select: { familyId: true } } },
  });
  if (!child) return 0;
  const familyId = child.user.familyId;

  const defs = await prisma.taskDefinition.findMany({
    where: {
      familyId,
      isActive: true,
      recurrenceType: { in: ["DAILY", "WEEKLY", "WEEKDAYS"] },
    },
  });

  const toCreate: { taskDefinitionId: string; childId: string; scheduledDate: Date }[] = [];
  for (const def of defs) {
    if (!shouldGenerateOn(def, now, weekday)) continue;
    toCreate.push({ taskDefinitionId: def.id, childId, scheduledDate: today });
  }
  if (toCreate.length === 0) return 0;

  // createMany with skipDuplicates avoids racing the unique index.
  const result = await prisma.assignedTask.createMany({
    data: toCreate.map((r) => ({
      ...r,
      status: "ASSIGNED" as AssignedTaskStatus,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

export function shouldGenerateOn(def: TaskDefinition, now: Date, weekday: number): boolean {
  switch (def.recurrenceType) {
    case "DAILY":
      return true;
    case "WEEKLY":
      // WEEKLY = once per ISO week; we schedule on Monday (weekday=1).
      return weekday === 1;
    case "WEEKDAYS": {
      if (!def.recurrenceDays) return false;
      let days: unknown;
      try {
        days = JSON.parse(def.recurrenceDays);
      } catch {
        return false;
      }
      return Array.isArray(days) && days.includes(weekday);
    }
    default:
      return false;
  }
}

// ---------- Child actions ----------

/**
 * Child marks an assigned task complete. Shared-trust model (pivot 2026-04-19):
 * we jump straight to APPROVED, apply the points delta, and update the streak
 * inside a single transaction. No parent approval gate.
 *
 * The cross-family guard is the assertion that `assigned.childId === childId`
 * — the session's childId is authoritative, and the action layer already
 * verified the child belongs to the caller's family via assertChildInFamily.
 */
export async function markTaskCompletedByChild(
  assignedTaskId: string,
  childId: string,
  actorUserId: string,
) {
  const assigned = await prisma.assignedTask.findUnique({
    where: { id: assignedTaskId },
    include: { taskDefinition: true },
  });
  if (!assigned || assigned.childId !== childId) throw new Error(t.errors.taskNotFound);
  return _completeAssignedTask(assigned, actorUserId);
}

/**
 * Parent-side equivalent of `markTaskCompletedByChild`. The childId comes
 * from the assigned task itself; the caller passes `familyId` so we refuse
 * to credit a task that belongs to another family.
 */
export async function markTaskCompletedByParent(
  familyId: string,
  assignedTaskId: string,
  actorUserId: string,
) {
  const assigned = await prisma.assignedTask.findFirst({
    where: { id: assignedTaskId, taskDefinition: { familyId } },
    include: { taskDefinition: true },
  });
  if (!assigned) throw new Error(t.errors.taskNotFound);
  return _completeAssignedTask(assigned, actorUserId);
}

/**
 * One-shot "I just did this" credit from the preset list.
 */
export async function createAndCompleteAdHocTask(
  familyId: string,
  input: { title: string; description?: string | null; categoryId: string; points: number },
  childId: string,
  actorUserId: string,
) {
  const child = await prisma.childProfile.findFirst({
    where: { id: childId, user: { familyId } },
  });
  if (!child) throw new Error(t.errors.childNotFound);
  const cat = await prisma.taskCategory.findFirst({
    where: { id: input.categoryId, familyId },
  });
  if (!cat) throw new Error(t.errors.validation);
  const safePoints = Math.max(0, Math.floor(input.points));
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const def = await tx.taskDefinition.create({
      data: {
        familyId,
        title: input.title,
        description: input.description ?? null,
        categoryId: input.categoryId,
        points: safePoints,
        recurrenceType: "NONE",
        recurrenceDays: null,
        createdById: actorUserId,
        isActive: true,
      },
    });
    const assigned = await tx.assignedTask.create({
      data: {
        taskDefinitionId: def.id,
        childId,
        scheduledDate: null,
        status: "APPROVED",
        completionRequestedAt: now,
        approvedAt: now,
        approvedById: actorUserId,
        pointsAwarded: safePoints,
      },
    });
    await applyPointsDelta(
      {
        childId,
        delta: safePoints,
        actorUserId,
        eventType: "TASK_APPROVED",
        referenceType: "AssignedTask",
        referenceId: assigned.id,
      },
      tx,
    );
    await updateStreakAfterTaskApproval(childId, now, tx);
    return assigned;
  });
}

async function _completeAssignedTask(
  assigned: { id: string; childId: string; status: string; taskDefinition: { points: number } },
  actorUserId: string,
) {
  if (assigned.status !== "ASSIGNED") throw new Error(t.errors.alreadyProcessed);
  const pts = assigned.taskDefinition.points;
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const updated = await tx.assignedTask.update({
      where: { id: assigned.id, status: "ASSIGNED" },
      data: {
        status: "APPROVED",
        completionRequestedAt: now,
        approvedAt: now,
        approvedById: actorUserId,
        pointsAwarded: pts,
      },
    });
    await applyPointsDelta(
      {
        childId: assigned.childId,
        delta: pts,
        actorUserId,
        eventType: "TASK_APPROVED",
        referenceType: "AssignedTask",
        referenceId: assigned.id,
      },
      tx,
    );
    await updateStreakAfterTaskApproval(assigned.childId, now, tx);
    return updated;
  });
}

// ---------- Parent approvals (legacy / parked path) ----------

export async function approveTask(
  familyId: string,
  assignedTaskId: string,
  actorUserId: string,
) {
  return prisma.$transaction(async (tx) => {
    const assigned = await tx.assignedTask.findFirst({
      where: { id: assignedTaskId, taskDefinition: { familyId } },
      include: { taskDefinition: true, child: true },
    });
    if (!assigned) throw new Error(t.errors.taskNotFound);
    if (assigned.status !== "PENDING_APPROVAL") throw new Error(t.errors.alreadyProcessed);
    const pts = assigned.taskDefinition.points;

    const updated = await tx.assignedTask.update({
      where: { id: assignedTaskId, status: "PENDING_APPROVAL" },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: actorUserId,
        pointsAwarded: pts,
      },
    });

    await applyPointsDelta(
      {
        childId: assigned.childId,
        delta: pts,
        actorUserId,
        eventType: "TASK_APPROVED",
        referenceType: "AssignedTask",
        referenceId: assignedTaskId,
      },
      tx,
    );

    await updateStreakAfterTaskApproval(assigned.childId, new Date(), tx);
    return updated;
  });
}

export async function rejectTask(
  familyId: string,
  assignedTaskId: string,
  reason: string | null,
  actorUserId: string,
) {
  return prisma.$transaction(async (tx) => {
    const assigned = await tx.assignedTask.findFirst({
      where: { id: assignedTaskId, taskDefinition: { familyId } },
    });
    if (!assigned) throw new Error(t.errors.taskNotFound);
    if (assigned.status !== "PENDING_APPROVAL") throw new Error(t.errors.alreadyProcessed);

    const updated = await tx.assignedTask.update({
      where: { id: assignedTaskId, status: "PENDING_APPROVAL" },
      data: {
        status: "REJECTED",
        approvedAt: new Date(),
        approvedById: actorUserId,
        rejectionReason: reason,
      },
    });
    await logEvent(
      {
        familyId,
        actorUserId,
        childId: assigned.childId,
        eventType: "TASK_REJECTED",
        referenceType: "AssignedTask",
        referenceId: assignedTaskId,
        metadata: reason ? { reason } : null,
      },
      tx,
    );
    return updated;
  });
}

// ---------- Queries ----------

export async function listTaskDefinitions(
  familyId: string,
  opts: { includeInactive?: boolean } = {},
) {
  return prisma.taskDefinition.findMany({
    where: { familyId, ...(opts.includeInactive ? {} : { isActive: true }) },
    include: {
      category: true,
      createdBy: { select: { id: true, role: true, name: true } },
    },
    orderBy: [{ isActive: "desc" }, { title: "asc" }],
  });
}

export async function listPendingApprovals(familyId: string) {
  return prisma.assignedTask.findMany({
    where: { status: "PENDING_APPROVAL", taskDefinition: { familyId } },
    include: {
      taskDefinition: { include: { category: true } },
      child: { include: { user: true } },
    },
    orderBy: { completionRequestedAt: "asc" },
  });
}

export async function listAssignedTasksForChildToday(childId: string) {
  const today = startOfLocalDay();
  return prisma.assignedTask.findMany({
    where: {
      childId,
      OR: [
        { scheduledDate: today },
        { scheduledDate: null, status: { in: ["ASSIGNED", "PENDING_APPROVAL"] } },
        {
          scheduledDate: null,
          status: "APPROVED",
          approvedAt: { gte: today },
        },
      ],
    },
    include: { taskDefinition: { include: { category: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
}

export async function listChildTaskHistory(childId: string, limit = 50) {
  return prisma.assignedTask.findMany({
    where: { childId, status: { in: ["APPROVED", "REJECTED"] } },
    include: { taskDefinition: { include: { category: true } } },
    orderBy: { approvedAt: "desc" },
    take: limit,
  });
}
