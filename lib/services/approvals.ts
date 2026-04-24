/**
 * Thin aggregate around the parent-side approval queues for the dashboard.
 * Core mutation logic lives in tasks.ts and rewards.ts.
 */

import { prisma } from "@/lib/db/prisma";

export async function getApprovalCounts() {
  const [taskCount, rewardCount] = await Promise.all([
    prisma.assignedTask.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.rewardRequest.count({ where: { status: "PENDING" } }),
  ]);
  return { taskCount, rewardCount };
}

export async function listAllPendingApprovals() {
  const [tasks, rewards] = await Promise.all([
    prisma.assignedTask.findMany({
      where: { status: "PENDING_APPROVAL" },
      include: {
        taskDefinition: { include: { category: true } },
        child: { include: { user: true } },
      },
      orderBy: { completionRequestedAt: "asc" },
    }),
    prisma.rewardRequest.findMany({
      where: { status: "PENDING" },
      include: { reward: true, child: { include: { user: true } } },
      orderBy: { requestedAt: "asc" },
    }),
  ]);
  return { tasks, rewards };
}
