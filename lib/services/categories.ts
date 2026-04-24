import { prisma } from "@/lib/db/prisma";
import { DEFAULT_CATEGORIES } from "@/config/defaults";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  type CategoryCreateInput,
  type CategoryUpdateInput,
} from "@/lib/validators/category";
import { t } from "@/lib/i18n/ru";

export async function listCategories(opts: { activeOnly?: boolean } = {}) {
  return prisma.taskCategory.findMany({
    where: opts.activeOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createCategory(input: unknown) {
  const parsed = categoryCreateSchema.safeParse(input);
  if (!parsed.success) throw new Error(t.errors.validation);
  const data: CategoryCreateInput = parsed.data;
  return prisma.taskCategory.create({ data });
}

export async function updateCategory(input: unknown) {
  const parsed = categoryUpdateSchema.safeParse(input);
  if (!parsed.success) throw new Error(t.errors.validation);
  const { id, ...rest }: CategoryUpdateInput = parsed.data;
  return prisma.taskCategory.update({ where: { id }, data: rest });
}

export async function archiveCategory(id: string): Promise<void> {
  const count = await prisma.taskDefinition.count({ where: { categoryId: id } });
  if (count > 0) {
    // Soft-disable: categories with tasks should stay but be hidden from pickers.
    await prisma.taskCategory.update({ where: { id }, data: { isActive: false } });
    return;
  }
  await prisma.taskCategory.delete({ where: { id } });
}

export async function seedDefaultCategoriesIfEmpty(): Promise<void> {
  const count = await prisma.taskCategory.count();
  if (count > 0) return;
  await prisma.taskCategory.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ name: c.name, sortOrder: c.sortOrder })),
    skipDuplicates: true,
  });
}
