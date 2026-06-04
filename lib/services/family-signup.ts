import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { familySignupSchema } from "@/lib/validators/auth";
import { getT, getLocale } from "@/lib/i18n/server";

/**
 * Token lifetime for invite links. Long enough that you can send it on a
 * Monday and the recipient can redeem it by Sunday; short enough that a
 * stale link doesn't sit redeemable forever.
 */
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Stable, non-secret hash for storing tokens in the DB. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a fresh signup invite. Returns the *plain* token for emailing
 * to the recipient — the DB only ever stores the SHA-256 hash so a DB
 * leak wouldn't reveal redeemable tokens.
 */
export async function createFamilySignupInvite(): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  await prisma.inviteToken.create({
    data: {
      tokenHash: hashToken(token),
      purpose: "FAMILY_SIGNUP",
      expiresAt,
      // familyId stays null — the token's whole job is to *create* the family.
    },
  });
  return { token, expiresAt };
}

export class FamilySignupError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "VALIDATION"
      | "TOKEN_INVALID"
      | "TOKEN_USED"
      | "TOKEN_EXPIRED"
      | "EMAIL_TAKEN",
  ) {
    super(message);
    this.name = "FamilySignupError";
  }
}

/**
 * Redeem a signup invite. Atomically creates the Family + first parent
 * User + seeded TaskCategory rows + marks the InviteToken used. Returns
 * the new family + user so the action layer can set a session cookie.
 *
 * All work happens in one transaction so a half-succeeded signup never
 * leaves a Family without a parent or a token marked used without rows.
 */
export async function redeemFamilySignupInvite(input: unknown): Promise<{
  familyId: string;
  userId: string;
  userName: string;
}> {
  const t = getT();
  const parsed = familySignupSchema.safeParse(input);
  if (!parsed.success) {
    throw new FamilySignupError(t.errors.validation, "VALIDATION");
  }
  const { token, familyName, name, email, password } = parsed.data;

  const tokenHash = hashToken(token);
  const invite = await prisma.inviteToken.findUnique({
    where: { tokenHash },
  });
  if (!invite || invite.purpose !== "FAMILY_SIGNUP") {
    throw new FamilySignupError(t.errors.invalidToken, "TOKEN_INVALID");
  }
  if (invite.usedAt) {
    throw new FamilySignupError(t.errors.invalidToken, "TOKEN_USED");
  }
  if (invite.expiresAt.getTime() <= Date.now()) {
    throw new FamilySignupError(t.errors.invalidToken, "TOKEN_EXPIRED");
  }

  // Email-uniqueness check is also enforced at the DB level (User.email is
  // globally unique), but we do it here too so we can throw a typed error
  // before starting the transaction.
  const emailTaken = await prisma.user.findUnique({ where: { email } });
  if (emailTaken) {
    throw new FamilySignupError("Email already in use", "EMAIL_TAKEN");
  }

  const passwordHash = await hashPassword(password);

  return prisma.$transaction(async (tx) => {
    // Re-check the token inside the transaction in case two browser tabs
    // raced the same link — first one through wins.
    const fresh = await tx.inviteToken.findUnique({ where: { tokenHash } });
    if (!fresh || fresh.usedAt) {
      throw new FamilySignupError(t.errors.invalidToken, "TOKEN_USED");
    }

    // Default the new family's locale to whatever the redeemer's browser
    // / device prefers (from Accept-Language or the fcr_locale cookie).
    // They can always change it from Settings.
    const family = await tx.family.create({
      data: { name: familyName, locale: getLocale() },
    });
    const user = await tx.user.create({
      data: {
        familyId: family.id,
        role: "PARENT",
        name,
        email,
        passwordHash,
        isActive: true,
      },
    });
    // Seed default categories using the active locale's dict, so the new
    // family sees category names in their own language. sortOrder mirrors
    // the array index (10, 20, 30…) to preserve the curated ordering.
    await tx.taskCategory.createMany({
      data: t.defaultCategories.map((name, i) => ({
        familyId: family.id,
        name,
        sortOrder: (i + 1) * 10,
      })),
      skipDuplicates: true,
    });
    await tx.inviteToken.update({
      where: { tokenHash },
      data: { usedAt: new Date(), familyId: family.id },
    });
    await tx.activityLog.create({
      data: {
        familyId: family.id,
        actorUserId: user.id,
        eventType: "FAMILY_CREATED",
      },
    });

    return { familyId: family.id, userId: user.id, userName: user.name };
  });
}
