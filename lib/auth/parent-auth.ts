import { prisma } from "@/lib/db/prisma";
import { verifyPassword, hashPassword } from "./password";
import { setSessionCookie, clearSessionCookie } from "./session";
import { isBlocked, recordFailure, recordSuccess } from "./rate-limit";
import { logEvent } from "@/lib/services/activity-log";
import { parentLoginSchema } from "@/lib/validators/auth";

export class LoginError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID" | "BLOCKED" | "VALIDATION" = "INVALID",
  ) {
    super(message);
    this.name = "LoginError";
  }
}

/**
 * Parent login.
 * Throws LoginError("INVALID") for bad creds, LoginError("BLOCKED") for throttle.
 * On success, sets the session cookie.
 */
export async function loginParent(input: unknown): Promise<{ userId: string; name: string }> {
  const parsed = parentLoginSchema.safeParse(input);
  if (!parsed.success) throw new LoginError("Validation failed", "VALIDATION");
  const { email, password } = parsed.data;

  const key = `parent:${email}`;
  if (isBlocked(key)) throw new LoginError("Too many attempts", "BLOCKED");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== "PARENT" || !user.isActive || !user.passwordHash) {
    recordFailure(key);
    throw new LoginError("Invalid credentials", "INVALID");
  }
  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    recordFailure(key);
    throw new LoginError("Invalid credentials", "INVALID");
  }
  recordSuccess(key);
  await setSessionCookie({ userId: user.id, role: "PARENT", name: user.name });
  await logEvent({ actorUserId: user.id, eventType: "LOGIN_PARENT" });
  return { userId: user.id, name: user.name };
}

export async function logoutParent(): Promise<void> {
  clearSessionCookie();
}

/** Parent-only: create another parent account. */
export async function createParentAccount(args: {
  name: string;
  email: string;
  password: string;
}): Promise<{ id: string }> {
  const email = args.email.trim().toLowerCase();
  const passwordHash = await hashPassword(args.password);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Email already in use");
  const created = await prisma.user.create({
    data: {
      role: "PARENT",
      name: args.name.trim(),
      email,
      passwordHash,
      isActive: true,
    },
  });
  return { id: created.id };
}
