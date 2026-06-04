"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { assertParent } from "@/lib/auth/permissions";
import { createChild, setChildActive, resetCycle } from "@/lib/services/children";
import { resetChildPin } from "@/lib/auth/child-pin-auth";
import { createParentAccount } from "@/lib/auth/parent-auth";
import { setOwnPin } from "@/lib/auth/pin-login";
import { addManualAdjustment } from "@/lib/services/points";
import { assertChildInFamily } from "@/lib/auth/family-scope";
import { parentCreateSchema, setPinSchema } from "@/lib/validators/auth";
import { getT } from "@/lib/i18n/server";
import { LOCALE_COOKIE_NAME } from "@/lib/i18n/server";
import { isLocale } from "@/lib/i18n";
import { prisma } from "@/lib/db/prisma";

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
  const t = getT();
  try {
    const s = await assertParent();
    const c = await createChild({ ...input, familyId: s.familyId });
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
  const t = getT();
  try {
    const s = await assertParent();
    await setChildActive(s.familyId, input.childId, input.active);
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
  const t = getT();
  try {
    const s = await assertParent();
    const parsed = parentCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: t.errors.validation };
    }
    const u = await createParentAccount({ ...parsed.data, familyId: s.familyId });
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
  const t = getT();
  try {
    const s = await assertParent();
    await resetChildPin({
      familyId: s.familyId,
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
  const t = getT();
  try {
    const s = await assertParent();
    await resetCycle(s.familyId, input.childId, s.userId);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

export async function setMyPinAction(input: { pin: string }): Promise<Res> {
  const t = getT();
  try {
    const s = await assertParent();
    const parsed = setPinSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: t.errors.validation };
    }
    await setOwnPin({
      familyId: s.familyId,
      userId: s.userId,
      newPin: parsed.data.pin,
    });
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
  const t = getT();
  try {
    const s = await assertParent();
    // Defense: addManualAdjustment doesn't take familyId (the childId carries
    // it via the relation), but we still verify ownership at the action
    // boundary so a forged id from another family is rejected up front.
    await assertChildInFamily(input.childId, s.familyId);
    await addManualAdjustment(input, s.userId);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}

/**
 * Switch the family's UI language. Updates both:
 *   - `Family.locale` (durable, applies on next login from any device)
 *   - `fcr_locale` cookie (immediate, scoped to this device)
 * Parent-only.
 */
export async function setLocaleAction(locale: string): Promise<Res> {
  const t = getT();
  try {
    const s = await assertParent();
    if (!isLocale(locale)) {
      return { ok: false, error: t.errors.validation };
    }
    await prisma.family.update({
      where: { id: s.familyId },
      data: { locale },
    });
    cookies().set({
      name: LOCALE_COOKIE_NAME,
      value: locale,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    // Revalidate every authenticated path so the new locale shows up immediately
    // without a hard refresh.
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}
