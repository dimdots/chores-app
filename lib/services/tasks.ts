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

export async function createTaskDefinition(input: unknown, actorUserId: string) {
  const parsed = taskDefinitionCreateSchema.safeParse(input);
  if (!parsed.success) throw new Error(t.errors.validation);
  const data = parsed.data;

  return prisma.taskDefinition.create({
    data: {
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

export async function updateTaskDefinition(input: unknown) {
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
  return prisma.taskDefinition.update({ where: { id }, data });
}

export async function archiveTaskDefinition(id: string) {
  return prisma.taskDefinition.update({ where: { id }, data: { isActive: false } });
}

export async function restoreTaskDefinition(id: string) {
  return prisma.taskDefinition.update({ where: { id }, data: { isActive: true } });
}

/**
 * Hard-delete a task definition and every AssignedTask row that references it.
 * ActivityLog entries are intentionally NOT touched — they stay around as the
 * historical record of points earned (balances were already applied).
 *
 * Used for housekeeping when the parent no longer wants a task around at all
 * (distinct from `archiveTaskDefinition`, which is a soft disable).
 */
export async function deleteTaskDefinition(id: string) {
  return prisma.$transaction([
    prisma.assignedTask.deleteMany({ where: { taskDefinitionId: id } }),
    prisma.taskDefinition.delete({ where: { id } }),
  ]);
}

// ---------- Assignments ----------

export async function assignTaskToChild(input: unknown) {
  const parsed = assignTaskSchema.safeParse(input);
  if (!parsed.success) throw new Error(t.errors.validation);
  const { taskDefinitionId, childId, dueDate, scheduledDate } = parsed.data;
  const def = await prisma.taskDefinition.findUnique({ where: { id: taskDefinitionId } });
  if (!def || !def.isActive) throw new Error(t.errors.taskNotFound);
  const child = await prisma.childProfile.findUnique({ where: { id: childId } });
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
 */
export async function generateRecurringTasksIfNeeded(childId: string, now: Date = new Date()) {
  const today = startOfLocalDay(now);
  const weekday = localWeekday(now); // 0..6 Sun..Sat

  const defs = await prisma.taskDefinition.findMany({
    where: {
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
 * inside a single transaction. No parent approval gate. Family members react
 * on the resulting activity-feed entry instead of gating points.
 *
 * The legacy `approveTask` / `rejectTask` paths remain untouched in case we
 * ever need to reintroduce approvals as an opt-in mode.
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
 * Parent-side equivalent of `markTaskCompletedByChild`. The shared-trust
 * pivot lets either side check off a task — useful when the parent is the
 * one who actually saw it done (e.g., trash taken out under their nose) and
 * doesn't want to open the kid's account just to record it. The childId
 * comes from the assigned task itself; no separate match check is needed
 * because the parent already passed `assertParent` at the action layer.
 */
export async function markTaskCompletedByParent(
  assignedTaskId: string,
  actorUserId: string,
) {
  const assigned = await prisma.assignedTask.findUnique({
    where: { id: assignedTaskId },
    include: { taskDefinition: true },
  });
  if (!assigned) throw new Error(t.errors.taskNotFound);
  return _completeAssignedTask(assigned, actorUserId);
}

/**
 * One-shot "I just did this" credit from the preset list. Creates a fresh
 * one-off TaskDefinition (recurrence NONE), an AssignedTask in ASSIGNED, and
 * immediately marks it APPROVED — all in a single transaction so the points
 * delta, streak bump, and audit row stay consistent. Used by the per-row
 * "Готово" button on the preset picker; lets the kid (or parent) credit
 * points for an ad-hoc thing without first cluttering the todo list with a
 * row that would just be checked off seconds later.
 */
export async function createAndCompleteAdHocTask(
  input: { title: string; description?: string | null; categoryId: string; points: number },
  childId: string,
  actorUserId: string,
) {
  const child = await prisma.childProfile.findUnique({ where: { id: childId } });
  if (!child) throw new Error(t.errors.childNotFound);
  const cat = await prisma.taskCategory.findUnique({ where: { id: input.categoryId } });
  if (!cat) throw new Error(t.errors.validation);
  const safePoints = Math.max(0, Math.floor(input.points));
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const def = await tx.taskDefinition.create({
      data: {
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

// Shared completion path used by both child- and parent-initiated marks.
// Status guard + points delta + streak bump happen in a single transaction
// so a half-applied row never escapes (e.g., points credited but task still
// ASSIGNED, or vice versa).
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
        // approvedById is the actor (kid or parent) for the audit trail.
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

// ---------- Parent approvals ----------

export async function approveTask(
  assignedTaskId: string,
  actorUserId: string,
) {
  return prisma.$transaction(async (tx) => {
    const assigned = await tx.assignedTask.findUnique({
      where: { id: assignedTaskId },
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
  assignedTaskId: string,
  reason: string | null,
  actorUserId: string,
) {
  return prisma.$transaction(async (tx) => {
    const assigned = await tx.assignedTask.findUnique({ where: { id: assignedTaskId } });
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

export async function listTaskDefinitions(opts: { includeInactive?: boolean } = {}) {
  return prisma.taskDefinition.findMany({
    where: opts.includeInactive ? undefined : { isActive: true },
    include: {
      category: true,
      // Creator role is surfaced so the parent list can flag kid-added tasks
      // (shared-trust model: kids add tasks themselves, parents can see them).
      createdBy: { select: { id: true, role: true, name: true } },
    },
    orderBy: [{ isActive: "desc" }, { title: "asc" }],
  });
}

export async function listPendingApprovals() {
  return prisma.assignedTask.findMany({
    where: { status: "PENDING_APPROVAL" },
    include: {
      taskDefinition: { include: { category: true } },
      child: { include: { user: true } },
    },
    orderBy: { completionRequestedAt: "asc" },
  });
}

export async function listAssignedTasksForChildToday(childId: string) {
  const today = startOfLocalDay();
  // Returns three groups that all belong on today's "Tasks" tab:
  //   1. Tasks scheduled for today (any status — a recurring task auto-approved
  //      earlier today should still appear in the "done" list below the fold).
  //   2. Open one-off tasks with no schedule (ASSIGNED / legacy PENDING_APPROVAL).
  //   3. One-off tasks that were approved today (so kids see their own
  //      unscheduled task move from "to do" to "done" without disappearing).
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
