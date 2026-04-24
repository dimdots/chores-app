"use server";

import { revalidatePath } from "next/cache";
import { assertParent } from "@/lib/auth/permissions";
import {
  createReward,
  updateReward,
  archiveReward,
  restoreReward,
} from "@/lib/services/rewards";
import { t } from "@/lib/i18n/ru";

type Res = { ok: true; id?: string } | { ok: false; error: string };

function revalidate() {
  revalidatePath("/parent/rewards");
  revalidatePath("/parent/dashboard");
  revalidatePath("/child/rewards");
  revalidatePath("/child/dashboard");
}

export async function createRewardAction(input: {
  title: string;
  description?: string | null;
  cost: number;
  expiresAt?: string | null;
  quantityLimit?: number | null;
}): Promise<Res> {
  try {
    const s = await assertParent();
    const r = await createReward(input, s.userId);
    revalidate();
    return { ok: true, id: r.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function updateRewardAction(input: {
  id: string;
  title?: string;
  description?: string | null;
  cost?: number;
  expiresAt?: string | null;
  quantityLimit?: number | null;
  isActive?: boolean;
}): Promise<Res> {
  try {
    await assertParent();
    await updateReward(input);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function archiveRewardAction(id: string): Promise<Res> {
  try {
    await assertParent();
    await archiveReward(id);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function restoreRewardAction(id: string): Promise<Res> {
  try {
    await assertParent();
    await restoreReward(id);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}
