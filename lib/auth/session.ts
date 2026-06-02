import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { appConfig } from "@/config/app";
import type { SessionPayload } from "@/types/session";

const COOKIE_NAME = "fcr_session";
// Separate, longer-lived cookie that pins this device to a family. Set on
// successful login or signup so the login picker only shows that family's
// PIN profiles to people who've used the device before. Cleared only by
// explicit "switch family" (not currently exposed in UI).
const FAMILY_COOKIE_NAME = "fcr_family";
const FAMILY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function getSecretKey(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Set it to at least 32 chars (see .env.example).",
    );
  }
  return new TextEncoder().encode(raw);
}

function sessionDurationSeconds(role: "PARENT" | "CHILD"): number {
  const days = role === "PARENT" ? appConfig.parentSessionDays : appConfig.childSessionDays;
  return days * 24 * 60 * 60;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const seconds = sessionDurationSeconds(payload.role);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + seconds)
    .sign(getSecretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.userId === "string" &&
      typeof payload.familyId === "string" &&
      (payload.role === "PARENT" || payload.role === "CHILD") &&
      typeof payload.name === "string"
    ) {
      return {
        userId: payload.userId,
        familyId: payload.familyId,
        role: payload.role,
        name: payload.name,
        childId: typeof payload.childId === "string" ? payload.childId : undefined,
      };
    }
    // Token predates the multi-tenant pivot — refuse it so the user is forced
    // to log in again and pick up a fresh, family-scoped session.
    return null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  const seconds = sessionDurationSeconds(payload.role);
  cookies().set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: seconds,
  });
  // Pin this device to the family so the PIN picker can scope its list.
  cookies().set({
    name: FAMILY_COOKIE_NAME,
    value: payload.familyId,
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: FAMILY_COOKIE_MAX_AGE,
  });
}

export function clearSessionCookie(): void {
  cookies().set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  // Intentionally do NOT clear fcr_family on logout — the next visitor on
  // this device almost certainly belongs to the same family.
}

/** Read the per-device family pin set by the last login on this browser. */
export function getDeviceFamilyId(): string | null {
  return cookies().get(FAMILY_COOKIE_NAME)?.value ?? null;
}

/** Read the current session, verifying the JWT. Returns null if none. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
