import { prisma } from "@/lib/db/prisma";
import { t } from "@/lib/i18n/ru";

// The shared-trust pivot (2026-04-19) replaces the approval gate with
// pure-positive reactions. Locking the emoji set keeps this from drifting
// into a clawback-style "dislike" later — if we ever want more signal, we
// add a new explicit model rather than piggybacking here.
export const ALLOWED_REACTIONS = ["👍", "❤️", "🎉"] as const;
export type ReactionEmoji = (typeof ALLOWED_REACTIONS)[number];

export function isAllowedReaction(value: string): value is ReactionEmoji {
  return (ALLOWED_REACTIONS as readonly string[]).includes(value);
}

/**
 * Toggle a reaction: if this (log, user, emoji) row exists, remove it;
 * otherwise create it. Returns the resulting "present" boolean so the UI can
 * reflect optimistic state without a refetch.
 */
export async function toggleReaction(input: {
  activityLogId: string;
  userId: string;
  emoji: string;
}): Promise<{ present: boolean }> {
  if (!isAllowedReaction(input.emoji)) throw new Error(t.errors.validation);

  // Existence check first — cheap, indexed by the unique tuple.
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

  // Validate the log exists so we fail cleanly instead of relying on the FK
  // error bubbling up as a generic Prisma code.
  const log = await prisma.activityLog.findUnique({
    where: { id: input.activityLogId },
    select: { id: true },
  });
  if (!log) throw new Error(t.errors.notFound);

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
  // Counts keyed by emoji so the UI can render `👍 3 ❤️ 1` without grouping.
  counts: Record<string, number>;
  // Emojis the current viewer has already placed, for highlighting buttons.
  mine: string[];
};

/**
 * Summarize reactions for a batch of activity log ids, from the viewpoint of
 * a specific user. Kept batch-shaped so dashboards can fetch the whole feed's
 * reactions in a single round-trip.
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
