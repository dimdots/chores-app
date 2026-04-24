"use server";

import { revalidatePath } from "next/cache";
import { assertParent } from "@/lib/auth/permissions";
import { createChild, setChildActive, resetCycle } from "@/lib/services/children";
import { resetChildPin } from "@/lib/auth/child-pin-auth";
import { createParentAccount } from "@/lib/auth/parent-auth";
import { setOwnPin } from "@/lib/auth/pin-login";
import { addManualAdjustment } from "@/lib/services/points";
import { parentCreateSchema, setPinSchema } from "@/lib/validators/auth";
import { t } from "@/lib/i18n/ru";

type Res = { ok: true; id?: string } | { ok: false; error: string };

function revalidate() {
  revalidatePath("/parent/settings");
  revalidatePath("/parent/dashboard");
  revalidatePath("/parent/children");
  revalidatePath("/parent/reports");
}

export async function addChildAction(input: {
  name: string;
  displayName?: string;
  pin: string;
}): Promise<Res> {
  try {
    await assertParent();
    const c = await createChild(input);
    revalidate();
    return { ok: true, id: c.childId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function setChildActiveAction(input: {
  childId: string;
  active: boolean;
}): Promise<Res> {
  try {
    await assertParent();
    await setChildActive(input.childId, input.active);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function addParentAction(input: {
  name: string;
  email: string;
  password: string;
}): Promise<Res> {
  try {
    await assertParent();
    const parsed = parentCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: t.errors.validation };
    }
    const u = await createParentAccount(parsed.data);
    revalidate();
    return { ok: true, id: u.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function resetChildPinAction(input: {
  childUserId: string;
  newPin: string;
}): Promise<Res> {
  try {
    const s = await assertParent();
    await resetChildPin({
      childUserId: input.childUserId,
      newPin: input.newPin,
      actorUserId: s.userId,
    });
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function resetCycleAction(input: { childId: string }): Promise<Res> {
  try {
    const s = await assertParent();
    await resetCycle(input.childId, s.userId);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function setMyPinAction(input: { pin: string }): Promise<Res> {
  try {
    const s = await assertParent();
    const parsed = setPinSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: t.errors.validation };
    }
    await setOwnPin({ userId: s.userId, newPin: parsed.data.pin });
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function addAdjustmentAction(input: {
  childId: string;
  value: number;
  reason: string;
}): Promise<Res> {
  try {
    const s = await assertParent();
    await addManualAdjustment(input, s.userId);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}
