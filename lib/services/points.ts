import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import { pointsAdjustmentSchema } from "@/lib/validators/points";
import { logEvent } from "./activity-log";
import { getLevelForPoints } from "@/lib/utils/leveling";
import { t } from "@/lib/i18n/ru";

export class InsufficientPointsError extends Error {
  constructor() {
    super(t.errors.insufficientPoints);
    this.name = "InsufficientPointsError";
  }
}

export async function getCurrentPoints(childId: string): Promise<number> {
  const c = await prisma.childProfile.findUnique({
    where: { id: childId },
    select: { currentPoints: true },
  });
  return c?.currentPoints ?? 0;
}

/**
 * Apply a points delta atomically inside a transaction.
 *
 * Enforces currentPoints + delta >= 0. Updates currentLevel based on
 * thresholds. Writes an ActivityLog row. DOES NOT create a
 * PointAdjustment row — that's only for *manual* bonuses/penalties
 * (see addManualAdjustment).
 *
 * Level progress is driven by `lifetimePoints` — the cumulative positive-
 * only running total — NOT by `currentPoints`. This way claiming a reward
 * reduces the spendable balance without dropping the kid's level. Negative
 * deltas (reward claims, penalties) leave `lifetimePoints` untouched.
 *
 * Pass the transaction client `tx` so this runs inside the caller's tx.
 */
export async function applyPointsDelta(
  args: {
    childId: string;
    delta: number;
    actorUserId: string;
    eventType: string;
    referenceType?: string;
    referenceId?: string;
    metadata?: Prisma.InputJsonValue | null;
  },
  tx: Prisma.TransactionClient,
): Promise<{ newBalance: number; newLevel: number }> {
  const child = await tx.childProfile.findUnique({
    where: { id: args.childId },
    select: { currentPoints: true, lifetimePoints: true },
  });
  if (!child) throw new Error(t.errors.childNotFound);
  const next = child.currentPoints + args.delta;
  if (next < 0) throw new InsufficientPointsError();

  // Only positive deltas contribute to lifetime — negative ones (spend,
  // penalty) must not reverse level progress.
  const nextLifetime =
    child.lifetimePoints + (args.delta > 0 ? args.delta : 0);
  const level = getLevelForPoints(nextLifetime);
  await tx.childProfile.update({
    where: { id: args.childId },
    data: {
      currentPoints: next,
      lifetimePoints: nextLifetime,
      currentLevel: level,
    },
  });

  await logEvent(
    {
      actorUserId: args.actorUserId,
      childId: args.childId,
      eventType: args.eventType,
      referenceType: args.referenceType ?? null,
      referenceId: args.referenceId ?? null,
      pointsDelta: args.delta,
      metadata: args.metadata ?? null,
    },
    tx,
  );

  return { newBalance: next, newLevel: level };
}

/**
 * Manual bonus (positive value) or penalty (negative value). Creates a
 * PointAdjustment row AND applies the delta inside one transaction.
 */
export async function addManualAdjustment(input: unknown, actorUserId: string) {
  const parsed = pointsAdjustmentSchema.safeParse(input);
  if (!parsed.success) throw new Error(t.errors.validation);
  const { childId, value, reason } = parsed.data;

  return prisma.$transaction(async (tx) => {
    const adj = await tx.pointAdjustment.create({
      data: { childId, value, reason, createdById: actorUserId },
    });
    await applyPointsDelta(
      {
        childId,
        delta: value,
        actorUserId,
        eventType: value > 0 ? "ADJUSTMENT_BONUS" : "ADJUSTMENT_PENALTY",
        referenceType: "PointAdjustment",
        referenceId: adj.id,
        metadata: { reason },
      },
      tx,
    );
    return adj;
  });
}

/**
 * Debug / self-check: recompute the balance from ledger + snapshots and
 * compare to the denormalized `currentPoints`. Returns both values.
 */
export async function calculateChildBalanceFromLedgerOrValidatedState(childId: string) {
  const [profile, adjSum, approvedTasks, approvedRewards] = await Promise.all([
    prisma.childProfile.findUnique({
      where: { id: childId },
      select: { currentPoints: true },
    }),
    prisma.pointAdjustment.aggregate({
      where: { childId },
      _sum: { value: true },
    }),
    prisma.assignedTask.aggregate({
      where: { childId, status: "APPROVED" },
      _sum: { pointsAwarded: true },
    }),
    prisma.rewardRequest.aggregate({
      where: { childId, status: "APPROVED" },
      _sum: { costAtRequest: true },
    }),
  ]);
  const recomputed =
    (adjSum._sum.value ?? 0) +
    (approvedTasks._sum.pointsAwarded ?? 0) -
    (approvedRewards._sum.costAtRequest ?? 0);
  return {
    denormalized: profile?.currentPoints ?? 0,
    recomputed,
    consistent: (profile?.currentPoints ?? 0) === recomputed,
  };
}
