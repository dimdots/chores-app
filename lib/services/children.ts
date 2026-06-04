import { prisma } from "@/lib/db/prisma";
import { hashPin, isSixDigitPin } from "@/lib/auth/pin";
import { logEvent, titlesForActivityLogs } from "./activity-log";
import { getT } from "@/lib/i18n/server";
import { generateRecurringTasksIfNeeded, listAssignedTasksForChildToday } from "./tasks";
import { listAvailableRewardsForChild, listChildRewardHistory } from "./rewards";
import { resetStreakIfNeeded } from "./streaks";
import { getLevelInfo } from "@/lib/utils/leveling";
import { startOfLocalWeek } from "@/lib/utils/dates";
import { listAllPendingApprovals } from "./approvals";
import { getWeeklyPointsSeries, getMostCompletedTasks } from "./reports";
import { summarizeReactionsForLogs, type ReactionSummary } from "./reactions";

// ---------- Children administration ----------

export async function listChildren(familyId: string) {
  return prisma.childProfile.findMany({
    where: { user: { familyId } },
    include: { user: true },
    orderBy: [{ user: { isActive: "desc" } }, { displayName: "asc" }],
  });
}

export async function createChild(args: {
  familyId: string;
  name: string;
  displayName?: string;
  pin: string;
}): Promise<{ userId: string; childId: string }> {
  const t = getT();
  if (!isSixDigitPin(args.pin)) throw new Error(t.errors.pinMustBeSixDigits);
  const pinHash = await hashPin(args.pin);
  const user = await prisma.user.create({
    data: {
      familyId: args.familyId,
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

export async function setChildActive(familyId: string, childId: string, active: boolean) {
  const t = getT();
  const child = await prisma.childProfile.findFirst({
    where: { id: childId, user: { familyId } },
  });
  if (!child) throw new Error(t.errors.childNotFound);
  return prisma.user.update({ where: { id: child.userId }, data: { isActive: active } });
}

/** Cycle reset — records an ActivityLog event; no destructive mutation. */
export async function resetCycle(familyId: string, childId: string, actorUserId: string) {
  const t = getT();
  const child = await prisma.childProfile.findFirst({
    where: { id: childId, user: { familyId } },
  });
  if (!child) throw new Error(t.errors.childNotFound);
  await logEvent({
    familyId,
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
  referenceLabel: string;
  reactions: ReactionSummary;
};

export async function getChildDashboardData(
  familyId: string,
  childId: string,
  viewerUserId: string,
) {
  const t = getT();
  // Confirm the child belongs to the caller's family before doing any work.
  const ownership = await prisma.childProfile.findFirst({
    where: { id: childId, user: { familyId } },
    select: { id: true },
  });
  if (!ownership) throw new Error(t.errors.childNotFound);

  await generateRecurringTasksIfNeeded(childId);
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
        familyId,
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

  const levelInfo = getLevelInfo(profile.lifetimePoints);
  return { profile, levelInfo, todayTasks, rewards, recent: feed };
}

export type ParentFeedItem = FeedItem & {
  child: { id: string; displayName: string } | null;
};

export async function getParentDashboardData(familyId: string, viewerUserId: string) {
  const [{ tasks, rewards }, children, weekStart] = await Promise.all([
    listAllPendingApprovals(familyId),
    prisma.childProfile.findMany({
      where: { user: { familyId } },
      include: { user: true },
      orderBy: { displayName: "asc" },
    }),
    Promise.resolve(startOfLocalWeek()),
  ]);

  await Promise.all(
    children
      .filter((c) => c.user.isActive)
      .map((c) => generateRecurringTasksIfNeeded(c.id)),
  );

  const [weekly, topChores, recent, tasksByChild] = await Promise.all([
    Promise.all(children.map((c) => getWeeklyPointsSeries(c.id, weekStart))),
    getMostCompletedTasks(familyId, weekStart),
    prisma.activityLog.findMany({
      where: {
        familyId,
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
    Promise.all(children.map((c) => listAssignedTasksForChildToday(c.id))),
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

  const todayTasksByChild = children.map((child, i) => ({
    child,
    tasks: (tasksByChild[i] ?? []).filter(
      (t_) => t_.status === "ASSIGNED" || t_.status === "PENDING_APPROVAL",
    ),
  }));

  return {
    pendingTasks: tasks,
    pendingRewards: rewards,
    children,
    weekly,
    topChores,
    recent: feed,
    todayTasksByChild,
  };
}

// Re-export resetChildPin so "services/children" has the full child admin API.
export { resetChildPin } from "@/lib/auth/child-pin-auth";
