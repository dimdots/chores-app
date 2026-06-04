import { prisma } from "@/lib/db/prisma";
import { verifyPin, hashPin, isSixDigitPin } from "./pin";
import { setSessionCookie, clearSessionCookie } from "./session";
import { isBlocked, recordFailure, recordSuccess } from "./rate-limit";
import { logEvent } from "@/lib/services/activity-log";
import { pinLoginSchema } from "@/lib/validators/auth";
import { LoginError } from "./parent-auth";
import { setLocaleCookie } from "@/lib/i18n/server";

/**
 * Unified PIN login — works for any user (parent or child) that has a PIN set.
 */
export async function loginWithPin(
  input: unknown,
): Promise<{ userId: string; role: "PARENT" | "CHILD"; name: string; childId?: string }> {
  const parsed = pinLoginSchema.safeParse(input);
  if (!parsed.success) throw new LoginError("Validation failed", "VALIDATION");
  const { userId, pin } = parsed.data;

  const key = `pin:${userId}`;
  if (isBlocked(key)) throw new LoginError("Too many attempts", "BLOCKED");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { childProfile: true, family: { select: { locale: true } } },
  });
  if (!user || !user.isActive || !user.pinHash) {
    recordFailure(key);
    throw new LoginError("Invalid credentials", "INVALID");
  }
  const ok = await verifyPin(user.pinHash, pin);
  if (!ok) {
    recordFailure(key);
    throw new LoginError("Invalid credentials", "INVALID");
  }
  recordSuccess(key);

  const childId = user.childProfile?.id;
  await setSessionCookie({
    userId: user.id,
    familyId: user.familyId,
    role: user.role,
    name: user.name,
    childId,
  });
  setLocaleCookie(user.family.locale);
  await logEvent({
    familyId: user.familyId,
    actorUserId: user.id,
    childId: childId ?? null,
    eventType: user.role === "PARENT" ? "LOGIN_PARENT" : "LOGIN_CHILD",
  });
  return { userId: user.id, role: user.role, name: user.name, childId };
}

export async function logout(): Promise<void> {
  clearSessionCookie();
}

/**
 * Let the currently signed-in user set or change their own PIN.
 * Used by parents to onboard into the shared PIN picker.
 */
export async function setOwnPin(args: {
  familyId: string;
  userId: string;
  newPin: string;
}): Promise<void> {
  if (!isSixDigitPin(args.newPin)) throw new Error("PIN must be 6 digits");
  const pinHash = await hashPin(args.newPin);
  // updateMany so a forged userId from another family silently no-ops; the
  // caller treats the resulting count==0 the same way they treat a typo'd id.
  const res = await prisma.user.updateMany({
    where: { id: args.userId, familyId: args.familyId },
    data: { pinHash },
  });
  if (res.count === 0) throw new Error("User not found");
  await logEvent({
    familyId: args.familyId,
    actorUserId: args.userId,
    eventType: "PIN_SET",
  });
}
