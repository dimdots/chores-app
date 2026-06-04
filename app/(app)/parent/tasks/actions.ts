"use server";

import { revalidatePath } from "next/cache";
import { assertParent } from "@/lib/auth/permissions";
import {
  createTaskDefinition,
  updateTaskDefinition,
  archiveTaskDefinition,
  restoreTaskDefinition,
  deleteTaskDefinition,
  assignTaskToChild,
  markTaskCompletedByParent,
  createAndCompleteAdHocTask,
  creditExistingTask,
  uncreditAssignedTask,
} from "@/lib/services/tasks";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n/server";

/**
 * If the caller's family has exactly one active child, return their id so
 * the caller can auto-assign. Otherwise return null.
 */
async function singleActiveChildId(familyId: string): Promise<string | null> {
  const kids = await prisma.childProfile.findMany({
    where: { user: { familyId, isActive: true } },
    select: { id: true },
    take: 2,
  });
  if (kids.length !== 1) return null;
  return kids[0]!.id;
}

type Res = { ok: true; id?: string } | { ok: false; error: string };

function revalidate() {
  revalidatePath("/parent/tasks");
  revalidatePath("/parent/dashboard");
  revalidatePath("/child/dashboard");
  revalidatePath("/child/tasks");
}

export async function createTaskAction(input: {
  title: string;
  description?: string | null;
  categoryId: string;
  points: number;
  recurrenceType: "NONE" | "DAILY" | "WEEKLY" | "WEEKDAYS";
  recurrenceDays?: number[] | null;
}): Promise<Res> {
  const t = getT();
  try {
    const s = await assertParent();
    const r = await createTaskDefinition(s.familyId, input, s.userId);

    const onlyChildId = await singleActiveChildId(s.familyId);
    if (onlyChildId) {
      await assignTaskToChild(s.familyId, {
        taskDefinitionId: r.id,
        childId: onlyChildId,
        scheduledDate: null,
      });
    }

    revalidate();
    return { ok: true, id: r.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function updateTaskAction(input: {
  id: string;
  title?: string;
  description?: string | null;
  categoryId?: string;
  points?: number;
  recurrenceType?: "NONE" | "DAILY" | "WEEKLY" | "WEEKDAYS";
  recurrenceDays?: number[] | null;
  isActive?: boolean;
}): Promise<Res> {
  const t = getT();
  try {
    const s = await assertParent();
    await updateTaskDefinition(s.familyId, input);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function archiveTaskAction(id: string): Promise<Res> {
  const t = getT();
  try {
    const s = await assertParent();
    await archiveTaskDefinition(s.familyId, id);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function restoreTaskAction(id: string): Promise<Res> {
  const t = getT();
  try {
    const s = await assertParent();
    await restoreTaskDefinition(s.familyId, id);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function deleteTaskAction(id: string): Promise<Res> {
  const t = getT();
  try {
    const s = await assertParent();
    await deleteTaskDefinition(s.familyId, id);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function assignTaskAction(input: {
  taskDefinitionId: string;
  childId: string;
  scheduledDate?: string | null;
  dueDate?: string | null;
}): Promise<Res> {
  const t = getT();
  try {
    const s = await assertParent();
    await assignTaskToChild(s.familyId, input);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function createTasksFromPresetsAction(
  items: Array<{
    title: string;
    description?: string | null;
    categoryId: string;
    points: number;
  }>,
): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
  const t = getT();
  try {
    const s = await assertParent();
    if (!Array.isArray(items) || items.length === 0) {
      return { ok: false, error: t.errors.validation };
    }

    const onlyChildId = await singleActiveChildId(s.familyId);

    let created = 0;
    for (const item of items) {
      const def = await createTaskDefinition(
        s.familyId,
        {
          title: item.title,
          description: item.description ?? null,
          categoryId: item.categoryId,
          points: item.points,
          recurrenceType: "NONE",
        },
        s.userId,
      );
      if (onlyChildId) {
        await assignTaskToChild(s.familyId, {
          taskDefinitionId: def.id,
          childId: onlyChildId,
          scheduledDate: null,
        });
      }
      created += 1;
    }

    revalidate();
    return { ok: true, created };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function markTaskCompleteByParentAction(
  assignedTaskId: string,
): Promise<
  { ok: true; assignedTaskId: string; pointsAwarded: number } | { ok: false; error: string }
> {
  const t = getT();
  try {
    const s = await assertParent();
    const updated = await markTaskCompletedByParent(s.familyId, assignedTaskId, s.userId);
    revalidate();
    return { ok: true, assignedTaskId: updated.id, pointsAwarded: updated.pointsAwarded };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function uncreditTaskAction(assignedTaskId: string): Promise<Res> {
  const t = getT();
  try {
    const s = await assertParent();
    await uncreditAssignedTask(s.familyId, assignedTaskId, s.userId);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function completePresetAsParentAction(input: {
  title: string;
  description?: string | null;
  categoryId: string;
  points: number;
}): Promise<
  { ok: true; pointsAwarded: number; assignedTaskId: string } | { ok: false; error: string }
> {
  const t = getT();
  try {
    const s = await assertParent();
    const onlyChildId = await singleActiveChildId(s.familyId);
    if (!onlyChildId) {
      return { ok: false, error: t.tasks.bulkAssignNeedsSingleChild };
    }
    const assigned = await createAndCompleteAdHocTask(
      s.familyId,
      {
        title: input.title,
        description: input.description ?? null,
        categoryId: input.categoryId,
        points: input.points,
      },
      onlyChildId,
      s.userId,
    );
    revalidate();
    return {
      ok: true,
      pointsAwarded: Math.max(0, Math.floor(input.points)),
      assignedTaskId: assigned.id,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

/**
 * Bulk-delete user-defined tasks from the user-tasks picker. Mirrors
 * `deleteTaskAction` but for many ids at once. ActivityLog entries from
 * past completions stay intact (same as single-delete) — only the
 * TaskDefinition + its AssignedTask rows go away.
 */
export async function deleteTasksBulkAction(
  taskIds: string[],
): Promise<{ ok: true; deleted: number } | { ok: false; error: string }> {
  const t = getT();
  try {
    const s = await assertParent();
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return { ok: false, error: t.errors.validation };
    }
    let deleted = 0;
    for (const id of taskIds) {
      await deleteTaskDefinition(s.familyId, id);
      deleted += 1;
    }
    revalidate();
    return { ok: true, deleted };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

/**
 * Quick-credit for an existing user-defined task. Used by the user-tasks
 * picker (non-Russian families). Auto-targets the only active child the
 * same way the preset picker does; multi-child families need to use the
 * per-task panel instead.
 */
export async function creditExistingTaskAsParentAction(
  taskDefinitionId: string,
): Promise<
  { ok: true; pointsAwarded: number; assignedTaskId: string } | { ok: false; error: string }
> {
  const t = getT();
  try {
    const s = await assertParent();
    const onlyChildId = await singleActiveChildId(s.familyId);
    if (!onlyChildId) {
      return { ok: false, error: t.tasks.bulkAssignNeedsSingleChild };
    }
    const r = await creditExistingTask(s.familyId, taskDefinitionId, onlyChildId, s.userId);
    revalidate();
    return { ok: true, pointsAwarded: r.pointsAwarded, assignedTaskId: r.assignedTaskId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function assignTasksBulkAction(
  taskIds: string[],
): Promise<{ ok: true; assigned: number } | { ok: false; error: string }> {
  const t = getT();
  try {
    const s = await assertParent();
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return { ok: false, error: t.errors.validation };
    }

    const onlyChildId = await singleActiveChildId(s.familyId);
    if (!onlyChildId) {
      return { ok: false, error: t.tasks.bulkAssignNeedsSingleChild };
    }

    let assigned = 0;
    for (const id of taskIds) {
      await assignTaskToChild(s.familyId, {
        taskDefinitionId: id,
        childId: onlyChildId,
        scheduledDate: null,
      });
      assigned += 1;
    }

    revalidate();
    return { ok: true, assigned };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}
