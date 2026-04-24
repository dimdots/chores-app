/**
 * Database seeder.
 *
 * Creates:
 *   - default task categories
 *   - sample task definitions
 *   - sample rewards
 *   - ONE parent placeholder (email/password from env or defaults)
 *   - ONE child placeholder (PIN from env or default)
 *
 * IMPORTANT: change `SEED_PARENT_PASSWORD` / `SEED_CHILD_PIN` in production.
 *
 * Run:
 *   pnpm db:seed      (or `tsx prisma/seed.ts`)
 */

import { PrismaClient, RecurrenceType } from "@prisma/client";
import argon2 from "argon2";
import { DEFAULT_CATEGORIES, DEFAULT_TASKS, DEFAULT_REWARDS } from "../config/defaults";

const prisma = new PrismaClient();

const SEED_PARENT_EMAIL = process.env.SEED_PARENT_EMAIL ?? "parent@example.com";
const SEED_PARENT_PASSWORD = process.env.SEED_PARENT_PASSWORD ?? "change-me-now";
const SEED_PARENT_NAME = process.env.SEED_PARENT_NAME ?? "Родитель";

const SEED_CHILD_NAME = process.env.SEED_CHILD_NAME ?? "Ребёнок";
const SEED_CHILD_DISPLAY_NAME = process.env.SEED_CHILD_DISPLAY_NAME ?? SEED_CHILD_NAME;
const SEED_CHILD_PIN = process.env.SEED_CHILD_PIN ?? "123456";

const ARGON_OPTS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

async function seedCategories() {
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.taskCategory.upsert({
      where: { name: cat.name },
      update: { sortOrder: cat.sortOrder, isActive: true },
      create: { name: cat.name, sortOrder: cat.sortOrder, isActive: true },
    });
  }
}

async function seedParent(): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { email: SEED_PARENT_EMAIL } });
  if (existing) return existing.id;
  const passwordHash = await argon2.hash(SEED_PARENT_PASSWORD, ARGON_OPTS);
  const parent = await prisma.user.create({
    data: {
      role: "PARENT",
      name: SEED_PARENT_NAME,
      email: SEED_PARENT_EMAIL,
      passwordHash,
      isActive: true,
    },
  });
  return parent.id;
}

async function seedChild(): Promise<string> {
  const existing = await prisma.user.findFirst({
    where: { role: "CHILD", name: SEED_CHILD_NAME },
    include: { childProfile: true },
  });
  if (existing?.childProfile) return existing.childProfile.id;

  if (!/^\d{6}$/.test(SEED_CHILD_PIN)) {
    throw new Error("SEED_CHILD_PIN must be exactly 6 digits");
  }
  const pinHash = await argon2.hash(SEED_CHILD_PIN, ARGON_OPTS);
  const childUser = await prisma.user.create({
    data: {
      role: "CHILD",
      name: SEED_CHILD_NAME,
      pinHash,
      isActive: true,
      childProfile: { create: { displayName: SEED_CHILD_DISPLAY_NAME } },
    },
    include: { childProfile: true },
  });
  return childUser.childProfile!.id;
}

async function seedTasks(parentId: string) {
  for (const tdef of DEFAULT_TASKS) {
    const category = await prisma.taskCategory.findUnique({ where: { name: tdef.categoryName } });
    if (!category) continue;
    const existing = await prisma.taskDefinition.findFirst({
      where: { title: tdef.title, categoryId: category.id },
    });
    if (existing) continue;
    await prisma.taskDefinition.create({
      data: {
        title: tdef.title,
        description: tdef.description ?? null,
        categoryId: category.id,
        points: tdef.points,
        recurrenceType: tdef.recurrenceType as RecurrenceType,
        recurrenceDays: tdef.recurrenceDays ? JSON.stringify(tdef.recurrenceDays) : null,
        createdById: parentId,
        isActive: true,
      },
    });
  }
}

async function seedRewards(parentId: string) {
  for (const r of DEFAULT_REWARDS) {
    const existing = await prisma.reward.findFirst({ where: { title: r.title } });
    if (existing) continue;
    await prisma.reward.create({
      data: {
        title: r.title,
        description: r.description ?? null,
        cost: r.cost,
        createdById: parentId,
        isActive: true,
      },
    });
  }
}

async function main() {
  console.log("→ Seeding categories…");
  await seedCategories();

  console.log("→ Seeding parent placeholder…");
  const parentId = await seedParent();

  console.log("→ Seeding child placeholder…");
  await seedChild();

  console.log("→ Seeding sample tasks…");
  await seedTasks(parentId);

  console.log("→ Seeding sample rewards…");
  await seedRewards(parentId);

  console.log("✓ Seed complete.");
  console.log(
    "  Parent: %s / %s  (CHANGE THE PASSWORD IMMEDIATELY)",
    SEED_PARENT_EMAIL,
    SEED_PARENT_PASSWORD,
  );
  console.log(
    "  Child:  %s  PIN: %s   (CHANGE THE PIN FROM /parent/settings)",
    SEED_CHILD_NAME,
    SEED_CHILD_PIN,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
