/**
 * Database seeder. Idempotently bootstraps an empty database with the legacy
 * "Dima" family, default categories, sample tasks, sample rewards, one parent,
 * and one child placeholder.
 *
 * After the multi-tenant pivot, every seeded row belongs to a single
 * pre-existing Family (id "family_dima_legacy") — created by the migration
 * 20260528120000_add_family_tenancy, or by this seeder on a brand-new DB.
 *
 * Run:
 *   pnpm db:seed      (or `tsx prisma/seed.ts`)
 */

import { PrismaClient, RecurrenceType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_CATEGORIES, DEFAULT_TASKS, DEFAULT_REWARDS } from "../config/defaults";

const prisma = new PrismaClient();

const LEGACY_FAMILY_ID = "family_dima_legacy";

const SEED_PARENT_EMAIL = process.env.SEED_PARENT_EMAIL ?? "parent@example.com";
const SEED_PARENT_PASSWORD = process.env.SEED_PARENT_PASSWORD ?? "change-me-now";
const SEED_PARENT_NAME = process.env.SEED_PARENT_NAME ?? "Родитель";

const SEED_CHILD_NAME = process.env.SEED_CHILD_NAME ?? "Ребёнок";
const SEED_CHILD_DISPLAY_NAME = process.env.SEED_CHILD_DISPLAY_NAME ?? SEED_CHILD_NAME;
const SEED_CHILD_PIN = process.env.SEED_CHILD_PIN ?? "123456";

const BCRYPT_ROUNDS = 12;

async function seedFamily() {
  await prisma.family.upsert({
    where: { id: LEGACY_FAMILY_ID },
    update: {},
    create: { id: LEGACY_FAMILY_ID, name: "Dima", locale: "ru" },
  });
}

async function seedCategories() {
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.taskCategory.upsert({
      where: { familyId_name: { familyId: LEGACY_FAMILY_ID, name: cat.name } },
      update: { sortOrder: cat.sortOrder, isActive: true },
      create: {
        familyId: LEGACY_FAMILY_ID,
        name: cat.name,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
    });
  }
}

async function seedParent(): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { email: SEED_PARENT_EMAIL } });
  if (existing) return existing.id;
  const passwordHash = await bcrypt.hash(SEED_PARENT_PASSWORD, BCRYPT_ROUNDS);
  const parent = await prisma.user.create({
    data: {
      familyId: LEGACY_FAMILY_ID,
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
    where: { familyId: LEGACY_FAMILY_ID, role: "CHILD", name: SEED_CHILD_NAME },
    include: { childProfile: true },
  });
  if (existing?.childProfile) return existing.childProfile.id;

  if (!/^\d{6}$/.test(SEED_CHILD_PIN)) {
    throw new Error("SEED_CHILD_PIN must be exactly 6 digits");
  }
  const pinHash = await bcrypt.hash(SEED_CHILD_PIN, BCRYPT_ROUNDS);
  const childUser = await prisma.user.create({
    data: {
      familyId: LEGACY_FAMILY_ID,
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
    const category = await prisma.taskCategory.findUnique({
      where: { familyId_name: { familyId: LEGACY_FAMILY_ID, name: tdef.categoryName } },
    });
    if (!category) continue;
    const existing = await prisma.taskDefinition.findFirst({
      where: { familyId: LEGACY_FAMILY_ID, title: tdef.title, categoryId: category.id },
    });
    if (existing) continue;
    await prisma.taskDefinition.create({
      data: {
        familyId: LEGACY_FAMILY_ID,
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
    const existing = await prisma.reward.findFirst({
      where: { familyId: LEGACY_FAMILY_ID, title: r.title },
    });
    if (existing) continue;
    await prisma.reward.create({
      data: {
        familyId: LEGACY_FAMILY_ID,
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
  console.log("→ Seeding family…");
  await seedFamily();

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
