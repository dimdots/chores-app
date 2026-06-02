"use server";

import {
  redeemFamilySignupInvite,
  FamilySignupError,
} from "@/lib/services/family-signup";
import { setSessionCookie } from "@/lib/auth/session";
import { t } from "@/lib/i18n/ru";

export type SignupResult =
  | { ok: true }
  | { ok: false; error: string; code?: FamilySignupError["code"] };

export async function familySignupAction(input: {
  token: string;
  familyName: string;
  name: string;
  email: string;
  password: string;
}): Promise<SignupResult> {
  try {
    const { familyId, userId, userName } = await redeemFamilySignupInvite(input);
    // Sign the new parent in immediately — the recipient doesn't need to
    // do a separate login step after redeeming their invite.
    await setSessionCookie({
      userId,
      familyId,
      role: "PARENT",
      name: userName,
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof FamilySignupError) {
      // Map service-layer codes to the localized strings the form expects.
      const msg =
        err.code === "TOKEN_EXPIRED"
          ? t.signup.tokenExpired
          : err.code === "TOKEN_USED"
            ? t.signup.tokenUsed
            : err.code === "TOKEN_INVALID"
              ? t.signup.tokenMissing
              : err.code === "EMAIL_TAKEN"
                ? t.signup.emailTaken
                : err.message;
      return { ok: false, error: msg, code: err.code };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : t.errors.unknown,
    };
  }
}
