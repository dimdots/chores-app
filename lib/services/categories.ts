import { prisma } from "@/lib/db/prisma";
import { DEFAULT_CATEGORIES } from "@/config/defaults";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  type CategoryCreateInput,
  type CategoryUpdateInput,
} from "@/lib/validators/category";
import { t } from "@/lib/i18n/ru";

export async function listCategories(
  familyId: string,
  opts: { activeOnly?: boolean } = {},
) {
  return prisma.taskCategory.findMany({
    where: { familyId, ...(opts.activeOnly ? { isActive: true } : {}) },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createCategory(familyId: string, input: unknown) {
  const parsed = categoryCreateSchema.safeParse(input);
  if (!parsed.success) throw new Error(t.errors.validation);
  const data: CategoryCreateInput = parsed.data;
  return prisma.taskCategory.create({ data: { ...data, familyId } });
}

export async function updateCategory(familyId: string, input: unknown) {
  const parsed = categoryUpdateSchema.safeParse(input);
  if (!parsed.success) throw new Error(t.errors.validation);
  const { id, ...rest }: CategoryUpdateInput = parsed.data;
  // updateMany lets us scope by (id, familyId) — Prisma's typed `update`
  // only accepts unique-key wheres, which would let a forged id from
  // another family slip through. updateMany with count check closes that.
  const res = await prisma.taskCategory.updateMany({
    where: { id, familyId },
    data: rest,
  });
  if (res.count === 0) throw new Error(t.errors.notFound);
  return prisma.taskCategory.findUnique({ where: { id } });
}

export async function archiveCategory(familyId: string, id: string): Promise<void> {
  const cat = await prisma.taskCategory.findFirst({
    where: { id, familyId },
    select: { id: true },
  });
  if (!cat) throw new Error(t.errors.notFound);
  const count = await prisma.taskDefinition.count({ where: { categoryId: id } });
  if (count > 0) {
    // Soft-disable: categories with tasks should stay but be hidden from pickers.
    await prisma.taskCategory.update({ where: { id }, data: { isActive: false } });
    return;
  }
  await prisma.taskCategory.delete({ where: { id } });
}

/** Idempotently seed the default categories for a family. */
export async function seedDefaultCategoriesIfEmpty(familyId: string): Promise<void> {
  const count = await prisma.taskCategory.count({ where: { familyId } });
  if (count > 0) return;
  await prisma.taskCategory.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({
      familyId,
      name: c.name,
      sortOrder: c.sortOrder,
    })),
    skipDuplicates: true,
  });
}
