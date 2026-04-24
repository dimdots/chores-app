"use server";

import { revalidatePath } from "next/cache";
import { assertSession } from "@/lib/auth/permissions";
import { toggleReaction, isAllowedReaction } from "@/lib/services/reactions";
import { t } from "@/lib/i18n/ru";

type Res = { ok: true; present: boolean } | { ok: false; error: string };

/**
 * Toggle the current viewer's reaction on an activity log entry. Both parent
 * and child sessions may call this — in the shared-trust model everyone in
 * the family reacts.
 */
export async function toggleReactionAction(
  activityLogId: string,
  emoji: string,
): Promise<Res> {
  try {
    if (!isAllowedReaction(emoji)) return { ok: false, error: t.errors.validation };
    const s = await assertSession();
    const { present } = await toggleReaction({
      activityLogId,
      userId: s.userId,
      emoji,
    });
    // Both dashboards and the history view surface reactions, so invalidate
    // every page that embeds the feed.
    revalidatePath("/child/dashboard");
    revalidatePath("/child/history");
    revalidatePath("/parent/dashboard");
    return { ok: true, present };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}
