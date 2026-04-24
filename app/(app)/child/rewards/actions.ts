"use server";

import { revalidatePath } from "next/cache";
import { assertChild } from "@/lib/auth/permissions";
import { requestReward } from "@/lib/services/rewards";
import { t } from "@/lib/i18n/ru";

export async function requestRewardAction(
  rewardId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const s = await assertChild();
    await requestReward({ rewardId }, s.childId, s.userId);
    revalidatePath("/child/dashboard");
    revalidatePath("/child/rewards");
    revalidatePath("/parent/approvals");
    revalidatePath("/parent/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}
