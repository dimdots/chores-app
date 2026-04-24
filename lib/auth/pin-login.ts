import { prisma } from "@/lib/db/prisma";
import { verifyPin, hashPin, isSixDigitPin } from "./pin";
import { setSessionCookie, clearSessionCookie } from "./session";
import { isBlocked, recordFailure, recordSuccess } from "./rate-limit";
import { logEvent } from "@/lib/services/activity-log";
import { pinLoginSchema } from "@/lib/validators/auth";
import { LoginError } from "./parent-auth";

/**
 * Unified PIN login — works for any user (parent or child) that has a PIN set.
 *
 * The picker UI lists all active users with a pinHash, so the caller just
 * clicks a profile and types 6 digits — same UX for everyone. This replaces
 * the old split between email-login (parent) and PIN-login (child) for the
 * common everyday path. Email login remains available as a fallback for
 * parents whose PIN is forgotten or not yet set.
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
    include: { childProfile: true },
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
    role: user.role,
    name: user.name,
    childId,
  });
  await logEvent({
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
export async function setOwnPin(args: { userId: string; newPin: string }): Promise<void> {
  if (!isSixDigitPin(args.newPin)) throw new Error("PIN must be 6 digits");
  const pinHash = await hashPin(args.newPin);
  await prisma.user.update({
    where: { id: args.userId },
    data: { pinHash },
  });
  await logEvent({
    actorUserId: args.userId,
    eventType: "PIN_SET",
  });
}
