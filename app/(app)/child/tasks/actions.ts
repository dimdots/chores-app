"use server";

import { revalidatePath } from "next/cache";
import { assertChild } from "@/lib/auth/permissions";
import {
  markTaskCompletedByChild,
  createTaskDefinition,
  assignTaskToChild,
  createAndCompleteAdHocTask,
  creditExistingTask,
  uncreditAssignedTask,
} from "@/lib/services/tasks";
import { getT } from "@/lib/i18n/server";

type Res = { ok: true; id?: string } | { ok: false; error: string };

function revalidate() {
  revalidatePath("/child/dashboard");
  revalidatePath("/child/tasks");
  revalidatePath("/parent/tasks");
  revalidatePath("/parent/approvals");
  revalidatePath("/parent/dashboard");
}

export async function markTaskCompleteAction(
  assignedTaskId: string,
): Promise<
  { ok: true; assignedTaskId: string; pointsAwarded: number } | { ok: false; error: string }
> {
  const t = getT();
  try {
    const session = await assertChild();
    const updated = await markTaskCompletedByChild(
      assignedTaskId,
      session.childId,
      session.userId,
    );
    revalidate();
    return { ok: true, assignedTaskId: updated.id, pointsAwarded: updated.pointsAwarded };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function uncreditTaskAction(assignedTaskId: string): Promise<Res> {
  const t = getT();
  try {
    const s = await assertChild();
    await uncreditAssignedTask(s.familyId, assignedTaskId, s.userId);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function creditExistingTaskAsChildAction(
  taskDefinitionId: string,
): Promise<
  { ok: true; pointsAwarded: number; assignedTaskId: string } | { ok: false; error: string }
> {
  const t = getT();
  try {
    const s = await assertChild();
    const r = await creditExistingTask(s.familyId, taskDefinitionId, s.childId, s.userId);
    revalidate();
    return { ok: true, pointsAwarded: r.pointsAwarded, assignedTaskId: r.assignedTaskId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function completePresetAsChildAction(input: {
  title: string;
  description?: string | null;
  categoryId: string;
  points: number;
}): Promise<
  { ok: true; pointsAwarded: number; assignedTaskId: string } | { ok: false; error: string }
> {
  const t = getT();
  try {
    const s = await assertChild();
    const assigned = await createAndCompleteAdHocTask(
      s.familyId,
      {
        title: input.title,
        description: input.description ?? null,
        categoryId: input.categoryId,
        points: input.points,
      },
      s.childId,
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

export async function createChildTasksFromPresetsAction(
  items: Array<{
    title: string;
    description?: string | null;
    categoryId: string;
    points: number;
  }>,
): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
  const t = getT();
  try {
    const s = await assertChild();
    if (!Array.isArray(items) || items.length === 0) {
      return { ok: false, error: t.errors.validation };
    }

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
      await assignTaskToChild(s.familyId, {
        taskDefinitionId: def.id,
        childId: s.childId,
        scheduledDate: null,
      });
      created += 1;
    }

    revalidate();
    return { ok: true, created };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function createChildTaskAction(input: {
  title: string;
  categoryId: string;
  points: number;
  recurrenceType?: "NONE" | "DAILY" | "WEEKLY" | "WEEKDAYS";
  recurrenceDays?: number[] | null;
}): Promise<Res> {
  const t = getT();
  try {
    const s = await assertChild();
    const recurrenceType = input.recurrenceType ?? "NONE";
    const recurrenceDays =
      recurrenceType === "WEEKDAYS" ? input.recurrenceDays ?? [] : null;
    const r = await createTaskDefinition(
      s.familyId,
      {
        title: input.title,
        description: null,
        categoryId: input.categoryId,
        points: input.points,
        recurrenceType,
        recurrenceDays,
      },
      s.userId,
    );
    await assignTaskToChild(s.familyId, {
      taskDefinitionId: r.id,
      childId: s.childId,
      scheduledDate: null,
    });
    revalidate();
    return { ok: true, id: r.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}
