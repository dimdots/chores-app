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
} from "@/lib/services/tasks";
import { prisma } from "@/lib/db/prisma";
import { t } from "@/lib/i18n/ru";

/**
 * If there is exactly one active child in the family, return their id so the
 * caller can auto-assign. Otherwise return null — the caller should surface
 * an assign UI instead of guessing.
 */
async function singleActiveChildId(): Promise<string | null> {
  const kids = await prisma.childProfile.findMany({
    where: { user: { isActive: true } },
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
  try {
    const s = await assertParent();
    const r = await createTaskDefinition(input, s.userId);

    // Shared-trust model: when there's exactly one active kid in the family,
    // every new task lands on their board for today immediately — one-off or
    // recurring. For recurring tasks the daily generator continues producing
    // future days; this just seeds today so the parent sees the task appear
    // without having to wait for tomorrow's dashboard visit.
    const onlyChildId = await singleActiveChildId();
    if (onlyChildId) {
      await assignTaskToChild({
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
  try {
    await assertParent();
    await updateTaskDefinition(input);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function archiveTaskAction(id: string): Promise<Res> {
  try {
    await assertParent();
    await archiveTaskDefinition(id);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function restoreTaskAction(id: string): Promise<Res> {
  try {
    await assertParent();
    await restoreTaskDefinition(id);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

/**
 * Hard-delete a task (and all of its assignments). Separate from archive so
 * the parent can choose: hide it (archive) or really remove it (delete).
 */
export async function deleteTaskAction(id: string): Promise<Res> {
  try {
    await assertParent();
    await deleteTaskDefinition(id);
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
  try {
    await assertParent();
    await assignTaskToChild(input);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}
