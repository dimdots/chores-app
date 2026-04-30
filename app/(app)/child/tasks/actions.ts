"use server";

import { revalidatePath } from "next/cache";
import { assertChild } from "@/lib/auth/permissions";
import {
  markTaskCompletedByChild,
  createTaskDefinition,
  assignTaskToChild,
} from "@/lib/services/tasks";
import { t } from "@/lib/i18n/ru";

type Res = { ok: true; id?: string } | { ok: false; error: string };

function revalidate() {
  revalidatePath("/child/dashboard");
  revalidatePath("/child/tasks");
  revalidatePath("/parent/tasks");
  revalidatePath("/parent/approvals");
  revalidatePath("/parent/dashboard");
}

export async function markTaskCompleteAction(assignedTaskId: string): Promise<Res> {
  try {
    const session = await assertChild();
    await markTaskCompletedByChild(assignedTaskId, session.childId, session.userId);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

/**
 * Child creates their own task. In the shared-trust model, kids can add
 * tasks they want to do; parents see them in the same list and can adjust
 * point values or react on the activity feed if something looks off.
 *
 * The task is always auto-assigned to the creating child (they can only
 * add to their own queue). Recurrence is optional — NONE for a one-off,
 * or DAILY / WEEKLY / WEEKDAYS for an ongoing routine. For recurring
 * tasks we also seed today's assignment so the new task shows up on the
 * kid's board immediately without waiting for tomorrow's generator pass.
 */
/**
 * Bulk-create TaskDefinitions on the child side from the preset picker. Each
 * created task is auto-assigned to the calling kid (just like single-task
 * creation does — kids can only add to their own queue). Recurrence is
 * always NONE for preset picks; the kid can edit the resulting tasks later
 * if they want a recurring routine.
 */
export async function createChildTasksFromPresetsAction(
  items: Array<{
    title: string;
    description?: string | null;
    categoryId: string;
    points: number;
  }>,
): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
  try {
    const s = await assertChild();
    if (!Array.isArray(items) || items.length === 0) {
      return { ok: false, error: t.errors.validation };
    }

    let created = 0;
    for (const item of items) {
      const def = await createTaskDefinition(
        {
          title: item.title,
          description: item.description ?? null,
          categoryId: item.categoryId,
          points: item.points,
          recurrenceType: "NONE",
        },
        s.userId,
      );
      await assignTaskToChild({
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
  try {
    const s = await assertChild();
    const recurrenceType = input.recurrenceType ?? "NONE";
    const recurrenceDays =
      recurrenceType === "WEEKDAYS" ? input.recurrenceDays ?? [] : null;
    const r = await createTaskDefinition(
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
    await assignTaskToChild({
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
