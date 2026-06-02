/**
 * Integration tests for the core task + points flow (post-pivot 2026-04-19,
 * post-multi-tenant pivot 2026-05-28: every fixture lives inside its own
 * Family so tests don't leak across each other).
 *
 * Skips cleanly if DATABASE_URL isn't set or the DB isn't reachable.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { createParentAccount } from "@/lib/auth/parent-auth";
import { createChild } from "@/lib/services/children";
import { createCategory } from "@/lib/services/categories";
import {
  createTaskDefinition,
  assignTaskToChild,
  markTaskCompletedByChild,
} from "@/lib/services/tasks";
import { createReward, requestReward } from "@/lib/services/rewards";
import { addManualAdjustment, InsufficientPointsError } from "@/lib/services/points";
import { toggleReaction } from "@/lib/services/reactions";

const HAS_DB = Boolean(process.env.DATABASE_URL);

type Fixture = {
  familyId: string;
  parentId: string;
  childId: string;
  childUserId: string;
  categoryId: string;
};

async function makeFixture(): Promise<Fixture> {
  const uid = randomUUID().slice(0, 8);
  const family = await prisma.family.create({
    data: { name: `Family-${uid}`, locale: "ru" },
  });
  const parent = await createParentAccount({
    familyId: family.id,
    name: `Parent-${uid}`,
    email: `parent-${uid}@test.local`,
    password: "testpass12345",
  });
  const { userId: childUserId, childId } = await createChild({
    familyId: family.id,
    name: `Child-${uid}`,
    displayName: `Kid-${uid}`,
    pin: "123456",
  });
  const cat = await createCategory(family.id, { name: `Cat-${uid}`, sortOrder: 0 });
  return {
    familyId: family.id,
    parentId: parent.id,
    childId,
    childUserId,
    categoryId: cat.id,
  };
}

const d = HAS_DB ? describe : describe.skip;

d("integration: task completion updates balance, streak, and level", () => {
  let fx: Fixture;

  beforeAll(async () => {
    fx = await makeFixture();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("mark → auto-approves and awards points, advances streak", async () => {
    const def = await createTaskDefinition(
      fx.familyId,
      {
        title: "Clean room",
        categoryId: fx.categoryId,
        points: 25,
        recurrenceType: "NONE",
      },
      fx.parentId,
    );
    const assigned = await assignTaskToChild(fx.familyId, {
      taskDefinitionId: def.id,
      childId: fx.childId,
    });
    expect(assigned).not.toBeNull();
    await markTaskCompletedByChild(assigned!.id, fx.childId, fx.childUserId);

    const child = await prisma.childProfile.findUniqueOrThrow({ where: { id: fx.childId } });
    expect(child.currentPoints).toBe(25);
    expect(child.currentStreak).toBe(1);

    const row = await prisma.assignedTask.findUniqueOrThrow({ where: { id: assigned!.id } });
    expect(row.status).toBe("APPROVED");
    expect(row.pointsAwarded).toBe(25);
  });

  it("double-completion is a no-op (throws alreadyProcessed)", async () => {
    const def = await createTaskDefinition(
      fx.familyId,
      {
        title: "Empty bin",
        categoryId: fx.categoryId,
        points: 10,
        recurrenceType: "NONE",
      },
      fx.parentId,
    );
    const assigned = await assignTaskToChild(fx.familyId, {
      taskDefinitionId: def.id,
      childId: fx.childId,
    });
    await markTaskCompletedByChild(assigned!.id, fx.childId, fx.childUserId);
    const after = await prisma.childProfile.findUniqueOrThrow({
      where: { id: fx.childId },
    });
    await expect(
      markTaskCompletedByChild(assigned!.id, fx.childId, fx.childUserId),
    ).rejects.toThrow();
    const again = await prisma.childProfile.findUniqueOrThrow({
      where: { id: fx.childId },
    });
    expect(again.currentPoints).toBe(after.currentPoints);
  });

  it("manual penalty can't push balance negative", async () => {
    const child = await prisma.childProfile.findUniqueOrThrow({ where: { id: fx.childId } });
    await expect(
      addManualAdjustment(
        { childId: fx.childId, value: -(child.currentPoints + 1000), reason: "overdraw" },
        fx.parentId,
      ),
    ).rejects.toBeInstanceOf(InsufficientPointsError);
  });

  it("manual bonus updates balance and writes an activity log", async () => {
    const before = await prisma.childProfile.findUniqueOrThrow({
      where: { id: fx.childId },
    });
    await addManualAdjustment(
      { childId: fx.childId, value: 15, reason: "Помог по хозяйству" },
      fx.parentId,
    );
    const after = await prisma.childProfile.findUniqueOrThrow({
      where: { id: fx.childId },
    });
    expect(after.currentPoints).toBe(before.currentPoints + 15);
    const log = await prisma.activityLog.findFirst({
      where: { childId: fx.childId, eventType: "ADJUSTMENT_BONUS" },
      orderBy: { createdAt: "desc" },
    });
    expect(log?.pointsDelta).toBe(15);
    expect(log?.familyId).toBe(fx.familyId);
  });
});

d("integration: reward request auto-fulfills and debits points", () => {
  let fx: Fixture;

  beforeAll(async () => {
    fx = await makeFixture();
    await addManualAdjustment(
      { childId: fx.childId, value: 100, reason: "seed" },
      fx.parentId,
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("request auto-fulfills: deducts cost and lands APPROVED in one step", async () => {
    const reward = await createReward(
      fx.familyId,
      { title: "Ice cream", cost: 40 },
      fx.parentId,
    );
    const before = await prisma.childProfile.findUniqueOrThrow({
      where: { id: fx.childId },
    });
    const req = await requestReward(
      fx.familyId,
      { rewardId: reward.id },
      fx.childId,
      fx.childUserId,
    );
    const after = await prisma.childProfile.findUniqueOrThrow({
      where: { id: fx.childId },
    });
    expect(after.currentPoints).toBe(before.currentPoints - 40);

    const row = await prisma.rewardRequest.findUniqueOrThrow({
      where: { id: req.id },
    });
    expect(row.status).toBe("APPROVED");
    expect(row.costAtRequest).toBe(40);
  });

  it("insufficient balance blocks auto-fulfillment", async () => {
    const reward = await createReward(
      fx.familyId,
      { title: "Expensive toy", cost: 10_000 },
      fx.parentId,
    );
    await expect(
      requestReward(fx.familyId, { rewardId: reward.id }, fx.childId, fx.childUserId),
    ).rejects.toThrow();
  });

  it("quantityLimit is respected: the second request fails", async () => {
    const reward = await createReward(
      fx.familyId,
      { title: "Limited sticker", cost: 5, quantityLimit: 1 },
      fx.parentId,
    );
    await requestReward(
      fx.familyId,
      { rewardId: reward.id },
      fx.childId,
      fx.childUserId,
    );
    await expect(
      requestReward(fx.familyId, { rewardId: reward.id }, fx.childId, fx.childUserId),
    ).rejects.toThrow();
  });

  it("reactions: toggling adds then removes for the same user/emoji/log", async () => {
    const log = await prisma.activityLog.findFirstOrThrow({
      where: { childId: fx.childId, eventType: "REWARD_APPROVED" },
      orderBy: { createdAt: "desc" },
    });
    const first = await toggleReaction({
      familyId: fx.familyId,
      activityLogId: log.id,
      userId: fx.parentId,
      emoji: "🎉",
    });
    expect(first.present).toBe(true);
    const second = await toggleReaction({
      familyId: fx.familyId,
      activityLogId: log.id,
      userId: fx.parentId,
      emoji: "🎉",
    });
    expect(second.present).toBe(false);
  });

  it("cross-family reactions are rejected", async () => {
    const other = await makeFixture();
    const log = await prisma.activityLog.findFirstOrThrow({
      where: { childId: fx.childId, eventType: "REWARD_APPROVED" },
      orderBy: { createdAt: "desc" },
    });
    await expect(
      toggleReaction({
        familyId: other.familyId,
        activityLogId: log.id,
        userId: other.parentId,
        emoji: "🎉",
      }),
    ).rejects.toThrow();
  });
});
