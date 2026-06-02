import { prisma } from "@/lib/db/prisma";
import { t } from "@/lib/i18n/ru";

// The shared-trust pivot (2026-04-19) replaces the approval gate with
// pure-positive reactions.
export const ALLOWED_REACTIONS = ["👍", "❤️", "🎉"] as const;
export type ReactionEmoji = (typeof ALLOWED_REACTIONS)[number];

export function isAllowedReaction(value: string): value is ReactionEmoji {
  return (ALLOWED_REACTIONS as readonly string[]).includes(value);
}

/**
 * Toggle a reaction: if this (log, user, emoji) row exists, remove it;
 * otherwise create it. The activity log must belong to the caller's family
 * — a forged log id from another tenant returns the same "not found" the
 * UI would show for a stale id.
 */
export async function toggleReaction(input: {
  familyId: string;
  activityLogId: string;
  userId: string;
  emoji: string;
}): Promise<{ present: boolean }> {
  if (!isAllowedReaction(input.emoji)) throw new Error(t.errors.validation);

  const log = await prisma.activityLog.findFirst({
    where: { id: input.activityLogId, familyId: input.familyId },
    select: { id: true },
  });
  if (!log) throw new Error(t.errors.notFound);

  const existing = await prisma.reaction.findUnique({
    where: {
      activityLogId_userId_emoji: {
        activityLogId: input.activityLogId,
        userId: input.userId,
        emoji: input.emoji,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    return { present: false };
  }

  await prisma.reaction.create({
    data: {
      activityLogId: input.activityLogId,
      userId: input.userId,
      emoji: input.emoji,
    },
  });
  return { present: true };
}

export type ReactionSummary = {
  counts: Record<string, number>;
  mine: string[];
};

/**
 * Summarize reactions for a batch of activity log ids, from the viewpoint of
 * a specific user. Callers always pass log ids they've already family-scoped
 * (so we don't repeat the family filter here).
 */
export async function summarizeReactionsForLogs(
  logIds: string[],
  viewerUserId: string,
): Promise<Map<string, ReactionSummary>> {
  const out = new Map<string, ReactionSummary>();
  if (logIds.length === 0) return out;

  const rows = await prisma.reaction.findMany({
    where: { activityLogId: { in: logIds } },
    select: { activityLogId: true, userId: true, emoji: true },
  });

  for (const id of logIds) {
    out.set(id, { counts: {}, mine: [] });
  }
  for (const r of rows) {
    const s = out.get(r.activityLogId);
    if (!s) continue;
    s.counts[r.emoji] = (s.counts[r.emoji] ?? 0) + 1;
    if (r.userId === viewerUserId) s.mine.push(r.emoji);
  }
  return out;
}
