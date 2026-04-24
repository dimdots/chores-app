"use server";

import { revalidatePath } from "next/cache";
import { assertParent } from "@/lib/auth/permissions";
import { approveTask, rejectTask } from "@/lib/services/tasks";
import {
  approveRewardRequest,
  rejectRewardRequest,
} from "@/lib/services/rewards";
import { t } from "@/lib/i18n/ru";

function invalidate() {
  revalidatePath("/parent/dashboard");
  revalidatePath("/parent/approvals");
  revalidatePath("/child/dashboard");
  revalidatePath("/child/tasks");
  revalidatePath("/child/rewards");
  revalidatePath("/child/history");
}

export async function approveTaskAction(assignedTaskId: string) {
  try {
    const s = await assertParent();
    await approveTask(assignedTaskId, s.userId);
    invalidate();
    return { ok: true } as const;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown } as const;
  }
}

export async function rejectTaskAction(assignedTaskId: string, reason: string | null) {
  try {
    const s = await assertParent();
    await rejectTask(assignedTaskId, reason, s.userId);
    invalidate();
    return { ok: true } as const;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown } as const;
  }
}

export async function approveRewardRequestAction(requestId: string) {
  try {
    const s = await assertParent();
    await approveRewardRequest(requestId, s.userId);
    invalidate();
    return { ok: true } as const;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown } as const;
  }
}

export async function rejectRewardRequestAction(requestId: string, reason: string | null) {
  try {
    const s = await assertParent();
    await rejectRewardRequest(requestId, reason, s.userId);
    invalidate();
    return { ok: true } as const;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown } as const;
  }
}
