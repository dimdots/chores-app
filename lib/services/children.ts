import { prisma } from "@/lib/db/prisma";
import { hashPin, isSixDigitPin } from "@/lib/auth/pin";
import { logEvent, titlesForActivityLogs } from "./activity-log";
import { t } from "@/lib/i18n/ru";
import { generateRecurringTasksIfNeeded, listAssignedTasksForChildToday } from "./tasks";
import { listAvailableRewardsForChild, listChildRewardHistory } from "./rewards";
import { resetStreakIfNeeded } from "./streaks";
import { getLevelInfo } from "@/lib/utils/leveling";
import { startOfLocalWeek } from "@/lib/utils/dates";
import { listAllPendingApprovals } from "./approvals";
import { getWeeklyPointsSeries, getMostCompletedTasks } from "./reports";
import { summarizeReactionsForLogs, type ReactionSummary } from "./reactions";

// ---------- Children administration ----------

export async function listChildren() {
  return prisma.childProfile.findMany({
    include: { user: true },
    orderBy: [{ user: { isActive: "desc" } }, { displayName: "asc" }],
  });
}

export async function createChild(args: {
  name: string;
  displayName?: string;
  pin: string;
}): Promise<{ userId: string; childId: string }> {
  if (!isSixDigitPin(args.pin)) throw new Error(t.errors.pinMustBeSixDigits);
  const pinHash = await hashPin(args.pin);
  const user = await prisma.user.create({
    data: {
      role: "CHILD",
      name: args.name.trim(),
      pinHash,
      isActive: true,
      childProfile: {
        create: { displayName: (args.displayName ?? args.name).trim() },
      },
    },
    include: { childProfile: true },
  });
  return { userId: user.id, childId: user.childProfile!.id };
}

export async function setChildActive(childId: string, active: boolean) {
  const child = await prisma.childProfile.findUnique({ where: { id: childId } });
  if (!child) throw new Error(t.errors.childNotFound);
  return prisma.user.update({ where: { id: child.userId }, data: { isActive: active } });
}

/** Cycle reset — records an ActivityLog event; no destructive mutation. */
export async function resetCycle(childId: string, actorUserId: string) {
  const child = await prisma.childProfile.findUnique({ where: { id: childId } });
  if (!child) throw new Error(t.errors.childNotFound);
  await logEvent({
    actorUserId,
    childId,
    eventType: "CYCLE_RESET",
    metadata: { note: "Reporting cycle reset" },
  });
}

// ---------- Dashboards ----------

export type FeedItem = {
  id: string;
  eventType: string;
  pointsDelta: number;
  createdAt: Date;
  // Resolved title of the referenced task/reward, when available. Empty
  // string for events without a natural title (bonuses, cycle resets).
  referenceLabel: string;
  reactions: ReactionSummary;
};

export async function getChildDashboardData(childId: string, viewerUserId: string) {
  // Materialize today's recurring tasks lazily.
  await generateRecurringTasksIfNeeded(childId);
  // Drop a dangling streak if the child skipped a day or more.
  await resetStreakIfNeeded(childId);

  const [profile, todayTasks, rewards, recent] = await Promise.all([
    prisma.childProfile.findUnique({
      where: { id: childId },
      include: { user: true },
    }),
    listAssignedTasksForChildToday(childId),
    listAvailableRewardsForChild(childId),
    prisma.activityLog.findMany({
      where: {
        childId,
        eventType: { in: ["TASK_APPROVED", "REWARD_APPROVED", "ADJUSTMENT_BONUS"] },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);
  if (!profile) throw new Error(t.errors.childNotFound);

  const [reactionMap, labelMap] = await Promise.all([
    summarizeReactionsForLogs(
      recent.map((r) => r.id),
      viewerUserId,
    ),
    titlesForActivityLogs(recent),
  ]);
  const feed: FeedItem[] = recent.map((r) => ({
    id: r.id,
    eventType: r.eventType,
    pointsDelta: r.pointsDelta,
    createdAt: r.createdAt,
    referenceLabel: labelMap.get(r.id) ?? "",
    reactions: reactionMap.get(r.id) ?? { counts: {}, mine: [] },
  }));

  // Level progress is based on lifetimePoints (cumulative earned) so that
  // claiming a reward doesn't drop the level or reset the progress bar.
  const levelInfo = getLevelInfo(profile.lifetimePoints);
  return { profile, levelInfo, todayTasks, rewards, recent: feed };
}

export type ParentFeedItem = FeedItem & {
  child: { id: string; displayName: string } | null;
};

export async function getParentDashboardData(viewerUserId: string) {
  const [{ tasks, rewards }, children, weekStart] = await Promise.all([
    listAllPendingApprovals(),
    prisma.childProfile.findMany({ include: { user: true }, orderBy: { displayName: "asc" } }),
    Promise.resolve(startOfLocalWeek()),
  ]);

  const [weekly, topChores, recent] = await Promise.all([
    Promise.all(children.map((c) => getWeeklyPointsSeries(c.id, weekStart))),
    getMostCompletedTasks(weekStart),
    prisma.activityLog.findMany({
      where: {
        eventType: {
          in: [
            "TASK_APPROVED",
            "TASK_REJECTED",
            "REWARD_APPROVED",
            "REWARD_REJECTED",
            "REWARD_REQUESTED",
            "ADJUSTMENT_BONUS",
            "ADJUSTMENT_PENALTY",
            "CYCLE_RESET",
          ],
        },
      },
      include: { child: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const [reactionMap, labelMap] = await Promise.all([
    summarizeReactionsForLogs(
      recent.map((r) => r.id),
      viewerUserId,
    ),
    titlesForActivityLogs(recent),
  ]);
  const feed: ParentFeedItem[] = recent.map((r) => ({
    id: r.id,
    eventType: r.eventType,
    pointsDelta: r.pointsDelta,
    createdAt: r.createdAt,
    referenceLabel: labelMap.get(r.id) ?? "",
    reactions: reactionMap.get(r.id) ?? { counts: {}, mine: [] },
    child: r.child ? { id: r.child.id, displayName: r.child.displayName } : null,
  }));

  return {
    pendingTasks: tasks,
    pendingRewards: rewards,
    children,
    weekly,
    topChores,
    recent: feed,
  };
}

// Re-export resetChildPin so "services/children" has the full child admin API.
export { resetChildPin } from "@/lib/auth/child-pin-auth";
