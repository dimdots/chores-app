import { prisma } from "@/lib/db/prisma";
import {
  rewardCreateSchema,
  rewardUpdateSchema,
  requestRewardSchema,
} from "@/lib/validators/reward";
import { logEvent } from "./activity-log";
import { applyPointsDelta, InsufficientPointsError } from "./points";
import { t } from "@/lib/i18n/ru";

// ---------- Definitions ----------

export async function createReward(
  familyId: string,
  input: unknown,
  actorUserId: string,
) {
  const parsed = rewardCreateSchema.safeParse(input);
  if (!parsed.success) throw new Error(t.errors.validation);
  const data = parsed.data;
  return prisma.reward.create({
    data: {
      familyId,
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

export async function updateReward(familyId: string, input: unknown) {
  const parsed = rewardUpdateSchema.safeParse(input);
  if (!parsed.success) throw new Error(t.errors.validation);
  const { id, ...rest } = parsed.data;
  const res = await prisma.reward.updateMany({
    where: { id, familyId },
    data: rest,
  });
  if (res.count === 0) throw new Error(t.errors.rewardNotFound);
  return prisma.reward.findUnique({ where: { id } });
}

export async function archiveReward(familyId: string, id: string) {
  const res = await prisma.reward.updateMany({
    where: { id, familyId },
    data: { isActive: false },
  });
  if (res.count === 0) throw new Error(t.errors.rewardNotFound);
  return prisma.reward.findUnique({ where: { id } });
}

export async function restoreReward(familyId: string, id: string) {
  const res = await prisma.reward.updateMany({
    where: { id, familyId },
    data: { isActive: true },
  });
  if (res.count === 0) throw new Error(t.errors.rewardNotFound);
  return prisma.reward.findUnique({ where: { id } });
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

export async function listAvailableRewardsForChild(
  childId: string,
): Promise<AvailableRewardView[]> {
  // Derive familyId from the child so the caller doesn't have to thread it
  // through every dashboard composition site.
  const profile = await prisma.childProfile.findUnique({
    where: { id: childId },
    select: { currentPoints: true, user: { select: { familyId: true } } },
  });
  if (!profile) return [];
  const rewards = await prisma.reward.findMany({
    where: { familyId: profile.user.familyId, isActive: true },
    orderBy: { cost: "asc" },
  });
  const balance = profile.currentPoints;
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
 * familyId is passed by the caller so we can reject cross-family rewardIds
 * up front instead of letting a forged id sneak past the FK.
 */
export async function requestReward(
  familyId: string,
  input: unknown,
  childId: string,
  actorUserId: string,
) {
  const parsed = requestRewardSchema.safeParse(input);
  if (!parsed.success) throw new Error(t.errors.validation);
  const { rewardId } = parsed.data;

  return prisma.$transaction(async (tx) => {
    const reward = await tx.reward.findFirst({
      where: { id: rewardId, familyId },
    });
    if (!reward || !reward.isActive) throw new Error(t.errors.rewardUnavailable);
    if (reward.expiresAt && reward.expiresAt.getTime() <= Date.now()) {
      throw new Error(t.errors.rewardUnavailable);
    }
    if (reward.quantityLimit !== null && reward.quantityUsed >= reward.quantityLimit) {
      throw new Error(t.errors.rewardUnavailable);
    }
    const child = await tx.childProfile.findFirst({
      where: { id: childId, user: { familyId } },
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

export async function approveRewardRequest(
  familyId: string,
  requestId: string,
  actorUserId: string,
) {
  return prisma.$transaction(async (tx) => {
    const req = await tx.rewardRequest.findFirst({
      where: { id: requestId, reward: { familyId } },
      include: { reward: true },
    });
    if (!req) throw new Error(t.errors.rewardNotFound);
    if (req.status !== "PENDING") throw new Error(t.errors.alreadyProcessed);

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
  familyId: string,
  requestId: string,
  reason: string | null,
  actorUserId: string,
) {
  return prisma.$transaction(async (tx) => {
    const req = await tx.rewardRequest.findFirst({
      where: { id: requestId, reward: { familyId } },
    });
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
        familyId,
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

export async function listRewardDefinitions(
  familyId: string,
  opts: { includeInactive?: boolean } = {},
) {
  return prisma.reward.findMany({
    where: { familyId, ...(opts.includeInactive ? {} : { isActive: true }) },
    orderBy: [{ isActive: "desc" }, { cost: "asc" }],
  });
}

export async function listPendingRewardRequests(familyId: string) {
  return prisma.rewardRequest.findMany({
    where: { status: "PENDING", reward: { familyId } },
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
