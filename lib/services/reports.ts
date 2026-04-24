import { prisma } from "@/lib/db/prisma";
import { addDays } from "date-fns";
import { isoDateLocal, startOfLocalDay, startOfLocalWeek } from "@/lib/utils/dates";
import { toCsv } from "@/lib/utils/csv";

// ---------- Weekly points ----------

export type WeeklyPointsPoint = { date: string; points: number };

export async function getWeeklyPointsSeries(
  childId: string,
  weekStart: Date = startOfLocalWeek(),
): Promise<{ childId: string; series: WeeklyPointsPoint[]; total: number }> {
  const end = addDays(weekStart, 7);
  const tasks = await prisma.assignedTask.findMany({
    where: {
      childId,
      status: "APPROVED",
      approvedAt: { gte: weekStart, lt: end },
    },
    select: { approvedAt: true, pointsAwarded: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    buckets.set(isoDateLocal(addDays(weekStart, i)), 0);
  }
  for (const t of tasks) {
    if (!t.approvedAt) continue;
    const key = isoDateLocal(t.approvedAt);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + t.pointsAwarded);
  }
  const series: WeeklyPointsPoint[] = [...buckets.entries()].map(([date, points]) => ({
    date,
    points,
  }));
  const total = series.reduce((a, p) => a + p.points, 0);
  return { childId, series, total };
}

export async function getWeeklyPoints(childId: string, weekStart?: Date) {
  return getWeeklyPointsSeries(childId, weekStart);
}

// ---------- Most completed chores ----------

export async function getMostCompletedTasks(since: Date = startOfLocalWeek(), limit = 5) {
  const grouped = await prisma.assignedTask.groupBy({
    by: ["taskDefinitionId"],
    where: { status: "APPROVED", approvedAt: { gte: since } },
    _count: { _all: true },
    orderBy: { _count: { taskDefinitionId: "desc" } },
    take: limit,
  });
  if (grouped.length === 0) return [];
  const defs = await prisma.taskDefinition.findMany({
    where: { id: { in: grouped.map((g) => g.taskDefinitionId) } },
    include: { category: true },
  });
  const byId = new Map(defs.map((d) => [d.id, d]));
  return grouped
    .map((g) => {
      const def = byId.get(g.taskDefinitionId);
      if (!def) return null;
      return { definition: def, count: g._count._all };
    })
    .filter((x): x is { definition: (typeof defs)[number]; count: number } => x !== null);
}

// ---------- Reward history ----------

export async function getRewardHistory(childId?: string, limit = 200) {
  return prisma.rewardRequest.findMany({
    where: childId ? { childId } : undefined,
    include: { reward: true, child: { include: { user: true } } },
    orderBy: { requestedAt: "desc" },
    take: limit,
  });
}

// ---------- Activity history ----------

export async function getActivityHistory(filter: {
  childId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}) {
  return prisma.activityLog.findMany({
    where: {
      childId: filter.childId ?? undefined,
      createdAt: {
        gte: filter.from,
        lt: filter.to,
      },
    },
    include: { child: true, actor: true },
    orderBy: { createdAt: "desc" },
    take: filter.limit ?? 200,
  });
}

// ---------- CSV exports ----------

export async function exportCsvActivity(filter: { childId?: string; from?: Date; to?: Date }) {
  const rows = await getActivityHistory({ ...filter, limit: 5000 });
  return toCsv(
    rows.map((r) => ({
      createdAt: r.createdAt.toISOString(),
      eventType: r.eventType,
      childName: r.child?.displayName ?? "",
      actorName: r.actor?.name ?? "",
      pointsDelta: r.pointsDelta,
      referenceType: r.referenceType ?? "",
      referenceId: r.referenceId ?? "",
      metadata: r.metadata ? JSON.stringify(r.metadata) : "",
    })),
  );
}

export async function exportCsvTasks(filter: { childId?: string; from?: Date; to?: Date }) {
  const rows = await prisma.assignedTask.findMany({
    where: {
      childId: filter.childId,
      createdAt: { gte: filter.from, lt: filter.to },
    },
    include: {
      taskDefinition: { include: { category: true } },
      child: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  return toCsv(
    rows.map((r) => ({
      createdAt: r.createdAt.toISOString(),
      approvedAt: r.approvedAt?.toISOString() ?? "",
      status: r.status,
      childName: r.child.displayName,
      title: r.taskDefinition.title,
      category: r.taskDefinition.category.name,
      pointsAwarded: r.pointsAwarded,
      scheduledDate: r.scheduledDate ? isoDateLocal(r.scheduledDate) : "",
      rejectionReason: r.rejectionReason ?? "",
    })),
  );
}

export async function exportCsvPoints(filter: { childId?: string; from?: Date; to?: Date }) {
  const rows = await prisma.pointAdjustment.findMany({
    where: {
      childId: filter.childId,
      createdAt: { gte: filter.from, lt: filter.to },
    },
    include: { child: true, createdBy: true },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  return toCsv(
    rows.map((r) => ({
      createdAt: r.createdAt.toISOString(),
      childName: r.child.displayName,
      value: r.value,
      reason: r.reason,
      createdBy: r.createdBy.name,
    })),
  );
}

export async function exportCsvRewards(filter: { childId?: string; from?: Date; to?: Date }) {
  const rows = await prisma.rewardRequest.findMany({
    where: {
      childId: filter.childId,
      requestedAt: { gte: filter.from, lt: filter.to },
    },
    include: { reward: true, child: true, decidedBy: true },
    orderBy: { requestedAt: "desc" },
    take: 5000,
  });
  return toCsv(
    rows.map((r) => ({
      requestedAt: r.requestedAt.toISOString(),
      decidedAt: r.decidedAt?.toISOString() ?? "",
      status: r.status,
      childName: r.child.displayName,
      reward: r.reward.title,
      costAtRequest: r.costAtRequest,
      decidedBy: r.decidedBy?.name ?? "",
      rejectionReason: r.rejectionReason ?? "",
    })),
  );
}
