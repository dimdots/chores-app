/**
 * Thin aggregate around the parent-side approval queues for the dashboard.
 * Core mutation logic lives in tasks.ts and rewards.ts.
 *
 * Both queries are family-scoped: tasks via taskDefinition.familyId, rewards
 * via reward.familyId.
 */

import { prisma } from "@/lib/db/prisma";

export async function getApprovalCounts(familyId: string) {
  const [taskCount, rewardCount] = await Promise.all([
    prisma.assignedTask.count({
      where: { status: "PENDING_APPROVAL", taskDefinition: { familyId } },
    }),
    prisma.rewardRequest.count({
      where: { status: "PENDING", reward: { familyId } },
    }),
  ]);
  return { taskCount, rewardCount };
}

export async function listAllPendingApprovals(familyId: string) {
  const [tasks, rewards] = await Promise.all([
    prisma.assignedTask.findMany({
      where: { status: "PENDING_APPROVAL", taskDefinition: { familyId } },
      include: {
        taskDefinition: { include: { category: true } },
        child: { include: { user: true } },
      },
      orderBy: { completionRequestedAt: "asc" },
    }),
    prisma.rewardRequest.findMany({
      where: { status: "PENDING", reward: { familyId } },
      include: { reward: true, child: { include: { user: true } } },
      orderBy: { requestedAt: "asc" },
    }),
  ]);
  return { tasks, rewards };
}
