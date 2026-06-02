"use server";

import { revalidatePath } from "next/cache";
import { assertParent } from "@/lib/auth/permissions";
import {
  createCategory,
  updateCategory,
  archiveCategory,
} from "@/lib/services/categories";
import { t } from "@/lib/i18n/ru";

type Res = { ok: true; id?: string } | { ok: false; error: string };

function revalidate() {
  revalidatePath("/parent/categories");
  revalidatePath("/parent/tasks");
  revalidatePath("/parent/tasks/new");
}

export async function createCategoryAction(input: {
  name: string;
  sortOrder?: number;
}): Promise<Res> {
  try {
    const s = await assertParent();
    const c = await createCategory(s.familyId, input);
    revalidate();
    return { ok: true, id: c.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function updateCategoryAction(input: {
  id: string;
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<Res> {
  try {
    const s = await assertParent();
    await updateCategory(s.familyId, input);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function archiveCategoryAction(id: string): Promise<Res> {
  try {
    const s = await assertParent();
    await archiveCategory(s.familyId, id);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}
