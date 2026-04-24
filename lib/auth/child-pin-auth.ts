import { prisma } from "@/lib/db/prisma";
import { hashPin, verifyPin, isSixDigitPin } from "./pin";
import { setSessionCookie, clearSessionCookie } from "./session";
import { isBlocked, recordFailure, recordSuccess } from "./rate-limit";
import { logEvent } from "@/lib/services/activity-log";
import { childLoginSchema } from "@/lib/validators/auth";
import { LoginError } from "./parent-auth";

/**
 * Child login with (userId, pin). We expose a list of child users on the
 * login page so the child just picks their name and types the PIN. The
 * user id is NOT secret, but knowing it without the PIN gains nothing.
 */
export async function loginChild(input: unknown): Promise<{ childId: string; name: string }> {
  const parsed = childLoginSchema.safeParse(input);
  if (!parsed.success) throw new LoginError("Validation failed", "VALIDATION");
  const { userId, pin } = parsed.data;

  const key = `child:${userId}`;
  if (isBlocked(key)) throw new LoginError("Too many attempts", "BLOCKED");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { childProfile: true },
  });
  if (!user || user.role !== "CHILD" || !user.isActive || !user.pinHash || !user.childProfile) {
    recordFailure(key);
    throw new LoginError("Invalid credentials", "INVALID");
  }
  const ok = await verifyPin(user.pinHash, pin);
  if (!ok) {
    recordFailure(key);
    throw new LoginError("Invalid credentials", "INVALID");
  }
  recordSuccess(key);
  await setSessionCookie({
    userId: user.id,
    role: "CHILD",
    childId: user.childProfile.id,
    name: user.name,
  });
  await logEvent({
    actorUserId: user.id,
    childId: user.childProfile.id,
    eventType: "LOGIN_CHILD",
  });
  return { childId: user.childProfile.id, name: user.name };
}

export async function logoutChild(): Promise<void> {
  clearSessionCookie();
}

/** Parent-only: reset a child's PIN. */
export async function resetChildPin(args: {
  childUserId: string;
  newPin: string;
  actorUserId: string;
}): Promise<void> {
  if (!isSixDigitPin(args.newPin)) {
    throw new Error("PIN must be 6 digits");
  }
  const pinHash = await hashPin(args.newPin);
  const user = await prisma.user.findUnique({
    where: { id: args.childUserId },
    include: { childProfile: true },
  });
  if (!user || user.role !== "CHILD") throw new Error("Child not found");
  await prisma.user.update({
    where: { id: user.id },
    data: { pinHash },
  });
  await logEvent({
    actorUserId: args.actorUserId,
    childId: user.childProfile?.id ?? null,
    eventType: "PIN_RESET",
  });
}
