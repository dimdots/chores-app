import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/db/prisma";

export type LogEventInput = {
  actorUserId?: string | null;
  childId?: string | null;
  eventType: string;
  referenceType?: string | null;
  referenceId?: string | null;
  pointsDelta?: number;
  metadata?: Prisma.InputJsonValue | null;
};

type PrismaLike = Pick<PrismaClient, "activityLog"> | Prisma.TransactionClient;

/**
 * Append an audit row. Safe to call inside a Prisma transaction — pass the
 * tx client as `tx` so the event is rolled back on failure.
 */
export async function logEvent(
  input: LogEventInput,
  tx: PrismaLike = defaultPrisma,
): Promise<void> {
  await tx.activityLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      childId: input.childId ?? null,
      eventType: input.eventType,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      pointsDelta: input.pointsDelta ?? 0,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

/**
 * Batch-look-up the human-readable title for a set of activity log rows so
 * feeds can show "Задание сделано · Почистить зубы" rather than just
 * "Задание сделано". Uses at most two queries (one per reference type) and
 * returns a Map keyed by log id; logs with no resolvable reference (deleted
 * task, bonus/penalty, cycle reset) are simply absent from the map.
 */
export async function titlesForActivityLogs(
  logs: Array<{ id: string; referenceType: string | null; referenceId: string | null }>,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const taskIds = logs
    .filter((l) => l.referenceType === "AssignedTask" && l.referenceId)
    .map((l) => l.referenceId!);
  const rewardReqIds = logs
    .filter((l) => l.referenceType === "RewardRequest" && l.referenceId)
    .map((l) => l.referenceId!);

  const [assignedTasks, rewardRequests] = await Promise.all([
    taskIds.length
      ? defaultPrisma.assignedTask.findMany({
          where: { id: { in: taskIds } },
          select: { id: true, taskDefinition: { select: { title: true } } },
        })
      : Promise.resolve([]),
    rewardReqIds.length
      ? defaultPrisma.rewardRequest.findMany({
          where: { id: { in: rewardReqIds } },
          select: { id: true, reward: { select: { title: true } } },
        })
      : Promise.resolve([]),
  ]);

  const taskTitleById = new Map(
    assignedTasks.map((t) => [t.id, t.taskDefinition.title] as const),
  );
  const rewardTitleById = new Map(
    rewardRequests.map((r) => [r.id, r.reward.title] as const),
  );

  for (const l of logs) {
    if (!l.referenceId) continue;
    if (l.referenceType === "AssignedTask") {
      const title = taskTitleById.get(l.referenceId);
      if (title) out.set(l.id, title);
    } else if (l.referenceType === "RewardRequest") {
      const title = rewardTitleById.get(l.referenceId);
      if (title) out.set(l.id, title);
    }
  }
  return out;
}
