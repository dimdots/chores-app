/**
 * Dev-only cleanup: wipes tasks, rewards, activity, and reactions so you
 * can test the app from a clean slate. Keeps parent + child accounts and
 * categories; resets each child's points / streak / level back to zero.
 *
 * Run from the project root:
 *   node scripts/reset-test-data.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run reset-test-data.mjs in production.");
  }

  // Delete in FK-safe order (children first, then parents).
  const reactions = await prisma.reaction.deleteMany();
  const activity = await prisma.activityLog.deleteMany();
  const rewardRequests = await prisma.rewardRequest.deleteMany();
  const assignedTasks = await prisma.assignedTask.deleteMany();
  const taskDefinitions = await prisma.taskDefinition.deleteMany();
  const rewards = await prisma.reward.deleteMany();

  // Reset per-child counters so balances / streaks start fresh.
  const profiles = await prisma.childProfile.updateMany({
    data: {
      currentPoints: 0,
      lifetimePoints: 0,
      currentStreak: 0,
      currentLevel: 1,
    },
  });

  console.log("Reset complete:");
  console.table({
    reactions: reactions.count,
    activityLog: activity.count,
    rewardRequests: rewardRequests.count,
    assignedTasks: assignedTasks.count,
    taskDefinitions: taskDefinitions.count,
    rewards: rewards.count,
    childrenReset: profiles.count,
  });
  console.log("\nKept: users, child profiles, categories, sessions.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
