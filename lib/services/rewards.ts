import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import {
  rewardCreateSchema,
  rewardUpdateSchema,
  requestRewardSchema,
} from "@/lib/validators/reward";
import { logEvent } from "./activity-log";
import { applyPointsDelta, InsufficientPointsError } from "./points";
import { t } from "@/lib/i18n/ru";

// ---------- Definitions ----------

export async function createReward(input: unknown, actorUserId: string) {
  const parsed = rewardCreateSchema.safeParse(input);
  if (!parsed.success) throw new Error(t.errors.validation);
  const data = parsed.data;
  return prisma.reward.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      cost: data.cost,
      expiresAt: data.expiresAt ?? null,
      quantityLimit: data.quantityLimit ?? null,
      isActive: true,
      createdById: actorUserId,
    },
  });
}

export async function updateReward(input: unknown) {
  const parsed = rewardUpdateSchema.safeParse(input);
  if (!parsed.success) throw new Error(t.errors.validation);
  const { id, ...rest } = parsed.data;
  return prisma.reward.update({ where: { id }, data: rest });
}

export async function archiveReward(id: string) {
  return prisma.reward.update({ where: { id }, data: { isActive: false } });
}

export async function restoreReward(id: string) {
  return prisma.reward.update({ where: { id }, data: { isActive: true } });
}

// ---------- Availability ----------

export type AvailableRewardView = {
  id: string;
  title: string;
  description: string | null;
  cost: number;
  expiresAt: Date | null;
  quantityLimit: number | null;
  quantityUsed: number;
  canRequest: boolean;
  reason: "ok" | "inactive" | "expired" | "soldOut" | "insufficient";
};

export async function listAvailableRewardsForChild(childId: string): Promise<AvailableRewardView[]> {
  const [rewards, profile] = await Promise.all([
    prisma.reward.findMany({
      where: { isActive: true },
      orderBy: { cost: "asc" },
    }),
    prisma.childProfile.findUnique({
      where: { id: childId },
      select: { currentPoints: true },
    }),
  ]);
  const balance = profile?.currentPoints ?? 0;
  const now = new Date();
  return rewards.map((r): AvailableRewardView => {
    if (!r.isActive) {
      return { ...toView(r), canRequest: false, reason: "inactive" };
    }
    if (r.expiresAt && r.expiresAt.getTime() <= now.getTime()) {
      return { ...toView(r), canRequest: false, reason: "expired" };
    }
    if (r.quantityLimit !== null && r.quantityUsed >= r.quantityLimit) {
      return { ...toView(r), canRequest: false, reason: "soldOut" };
    }
    if (balance < r.cost) {
      return { ...toView(r), canRequest: false, reason: "insufficient" };
    }
    return { ...toView(r), canRequest: true, reason: "ok" };
  });
}

function toView(r: {
  id: string;
  title: string;
  description: string | null;
  cost: number;
  expiresAt: Date | null;
  quantityLimit: number | null;
  quantityUsed: number;
}) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    cost: r.cost,
    expiresAt: r.expiresAt,
    quantityLimit: r.quantityLimit,
    quantityUsed: r.quantityUsed,
  };
}

// ---------- Requests ----------

/**
 * Shared-trust model (pivot 2026-04-19): a reward "request" auto-fulfills.
 * Points are debited on the spot, quantityUsed is incremented atomically,
 * and the RewardRequest is written straight to APPROVED. The parent sees
 * it in the activity feed and can react — no decision gate.
 *
 * The legacy approveRewardRequest/rejectRewardRequest paths remain usable
 * for any lingering PENDING rows from the pre-pivot era.
 */
export async function requestReward(
  input: unknown,
  childId: string,
  actorUserId: string,
) {
  const parsed = requestRewardSchema.safeParse(input);
  if (!parsed.success) throw new Error(t.errors.validation);
  const { rewardId } = parsed.data;

  return prisma.$transaction(async (tx) => {
    const reward = await tx.reward.findUnique({ where: { id: rewardId } });
    if (!reward || !reward.isActive) throw new Error(t.errors.rewardUnavailable);
    if (reward.expiresAt && reward.expiresAt.getTime() <= Date.now()) {
      throw new Error(t.errors.rewardUnavailable);
    }
    if (reward.quantityLimit !== null && reward.quantityUsed >= reward.quantityLimit) {
      throw new Error(t.errors.rewardUnavailable);
    }
    const child = await tx.childProfile.findUnique({
      where: { id: childId },
      select: { currentPoints: true },
    });
    if (!child) throw new Error(t.errors.childNotFound);
    if (child.currentPoints < reward.cost) throw new InsufficientPointsError();

    const now = new Date();
    const req = await tx.rewardRequest.create({
      data: {
        rewardId: reward.id,
        childId,
        costAtRequest: reward.cost,
        status: "APPROVED",
        requestedAt: now,
        decidedAt: now,
        decidedById: actorUserId,
      },
    });

    // Respect quantity limit if set; increment quantityUsed atomically.
    if (reward.quantityLimit !== null) {
      const updated = await tx.reward.updateMany({
        where: {
          id: reward.id,
          quantityUsed: { lt: reward.quantityLimit },
        },
        data: { quantityUsed: { increment: 1 } },
      });
      if (updated.count === 0) throw new Error(t.errors.rewardUnavailable);
    }

    // applyPointsDelta enforces the non-negative balance invariant and
    // writes the REWARD_APPROVED activity entry that the family will react
    // to in the feed.
    await applyPointsDelta(
      {
        childId,
        delta: -reward.cost,
        actorUserId,
        eventType: "REWARD_APPROVED",
        referenceType: "RewardRequest",
        referenceId: req.id,
      },
      tx,
    );
    return req;
  });
}

export async function approveRewardRequest(requestId: string, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const req = await tx.rewardRequest.findUnique({
      where: { id: requestId },
      include: { reward: true },
    });
    if (!req) throw new Error(t.errors.rewardNotFound);
    if (req.status !== "PENDING") throw new Error(t.errors.alreadyProcessed);

    // Apply point deduction first — this throws InsufficientPointsError if the
    // child's balance has since dropped below the snapshotted cost.
    await applyPointsDelta(
      {
        childId: req.childId,
        delta: -req.costAtRequest,
        actorUserId,
        eventType: "REWARD_APPROVED",
        referenceType: "RewardRequest",
        referenceId: req.id,
      },
      tx,
    );

    // Respect quantity limit if set; increment quantityUsed atomically.
    if (req.reward.quantityLimit !== null) {
      const updated = await tx.reward.updateMany({
        where: {
          id: req.rewardId,
          quantityUsed: { lt: req.reward.quantityLimit },
        },
        data: { quantityUsed: { increment: 1 } },
      });
      if (updated.count === 0) throw new Error(t.errors.rewardUnavailable);
    }

    const r = await tx.rewardRequest.update({
      where: { id: requestId, status: "PENDING" },
      data: {
        status: "APPROVED",
        decidedAt: new Date(),
        decidedById: actorUserId,
      },
    });
    return r;
  });
}

export async function rejectRewardRequest(
  requestId: string,
  reason: string | null,
  actorUserId: string,
) {
  return prisma.$transaction(async (tx) => {
    const req = await tx.rewardRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new Error(t.errors.rewardNotFound);
    if (req.status !== "PENDING") throw new Error(t.errors.alreadyProcessed);
    const r = await tx.rewardRequest.update({
      where: { id: requestId, status: "PENDING" },
      data: {
        status: "REJECTED",
        decidedAt: new Date(),
        decidedById: actorUserId,
        rejectionReason: reason,
      },
    });
    await logEvent(
      {
        actorUserId,
        childId: req.childId,
        eventType: "REWARD_REJECTED",
        referenceType: "RewardRequest",
        referenceId: req.id,
        metadata: reason ? { reason } : null,
      },
      tx,
    );
    return r;
  });
}

// ---------- Queries ----------

export async function listRewardDefinitions(opts: { includeInactive?: boolean } = {}) {
  return prisma.reward.findMany({
    where: opts.includeInactive ? undefined : { isActive: true },
    orderBy: [{ isActive: "desc" }, { cost: "asc" }],
  });
}

export async function listPendingRewardRequests() {
  return prisma.rewardRequest.findMany({
    where: { status: "PENDING" },
    include: { reward: true, child: { include: { user: true } } },
    orderBy: { requestedAt: "asc" },
  });
}

export async function listChildRewardHistory(childId: string, limit = 50) {
  return prisma.rewardRequest.findMany({
    where: { childId },
    include: { reward: true },
    orderBy: { requestedAt: "desc" },
    take: limit,
  });
}
