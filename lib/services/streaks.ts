import type { Prisma } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/db/prisma";
import { calendarDaysBetween, isoDateLocal, startOfLocalDay } from "@/lib/utils/dates";

/**
 * Streak rules (MVP):
 *   - The streak counts consecutive calendar days (in APP_TIMEZONE) on which
 *     the child has at least one APPROVED task.
 *   - Approving a task today:
 *       - if lastStreakDate is today → no change
 *       - if lastStreakDate is yesterday → streak += 1
 *       - otherwise → streak = 1
 *     We store lastStreakDate = today after updating.
 *   - calculateCurrentStreak() is a deterministic recompute from the
 *     approved-task history; it's used by the child dashboard so a stale
 *     denormalized streak never shows a wrong value.
 */

type PrismaLike = Prisma.TransactionClient | typeof defaultPrisma;

/** Pure streak transition — exported for unit testing. */
export function nextStreakValue(args: {
  currentStreak: number;
  lastStreakDate: Date | null;
  today: Date;
}): number {
  if (!args.lastStreakDate) return 1;
  const diff = calendarDaysBetween(args.lastStreakDate, args.today);
  if (diff === 0) return args.currentStreak;
  if (diff === 1) return args.currentStreak + 1;
  return 1;
}

export async function updateStreakAfterTaskApproval(
  childId: string,
  now: Date,
  tx: PrismaLike = defaultPrisma,
): Promise<number> {
  const today = startOfLocalDay(now);
  const profile = await tx.childProfile.findUnique({
    where: { id: childId },
    select: { currentStreak: true, lastStreakDate: true },
  });
  if (!profile) return 0;
  const next = nextStreakValue({
    currentStreak: profile.currentStreak,
    lastStreakDate: profile.lastStreakDate,
    today,
  });
  await tx.childProfile.update({
    where: { id: childId },
    data: { currentStreak: next, lastStreakDate: today },
  });
  return next;
}

/**
 * Authoritative streak calculation from history. Walks back from "today"
 * counting consecutive calendar days with at least one approved task.
 * Stops once a day has none or when we've checked 365 days.
 */
export async function calculateCurrentStreak(childId: string, now: Date = new Date()): Promise<number> {
  const todayStart = startOfLocalDay(now);
  // Pull all approved tasks for this child from the last 366 days.
  const from = new Date(todayStart.getTime() - 366 * 24 * 60 * 60 * 1000);
  const tasks = await defaultPrisma.assignedTask.findMany({
    where: {
      childId,
      status: "APPROVED",
      approvedAt: { gte: from },
    },
    select: { approvedAt: true },
  });
  const dayKeys = new Set<string>();
  for (const t of tasks) {
    if (!t.approvedAt) continue;
    dayKeys.add(isoDateLocal(t.approvedAt));
  }
  let streak = 0;
  for (let i = 0; i < 366; i++) {
    const day = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
    const key = isoDateLocal(day);
    if (dayKeys.has(key)) streak++;
    else break;
  }
  return streak;
}

/** Called on dashboard load to keep denormalized streak honest without risk. */
export async function resetStreakIfNeeded(childId: string, now: Date = new Date()): Promise<number> {
  const profile = await defaultPrisma.childProfile.findUnique({
    where: { id: childId },
    select: { lastStreakDate: true, currentStreak: true },
  });
  if (!profile) return 0;
  const today = startOfLocalDay(now);
  if (!profile.lastStreakDate) return profile.currentStreak;
  const diff = calendarDaysBetween(profile.lastStreakDate, today);
  if (diff >= 2 && profile.currentStreak !== 0) {
    await defaultPrisma.childProfile.update({
      where: { id: childId },
      data: { currentStreak: 0 },
    });
    return 0;
  }
  return profile.currentStreak;
}
