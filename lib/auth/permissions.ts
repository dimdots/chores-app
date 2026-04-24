import { redirect } from "next/navigation";
import { getSession } from "./session";
import type { ChildSession, ParentSession, SessionPayload } from "@/types/session";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403 = 401,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * For server components / pages: returns the session or redirects to the
 * appropriate login screen.
 */
export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export async function requireParent(): Promise<ParentSession> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== "PARENT") redirect("/child/dashboard");
  return s as ParentSession;
}

export async function requireChild(): Promise<ChildSession> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== "CHILD" || !s.childId) redirect("/parent/dashboard");
  return s as ChildSession;
}

/**
 * For server actions / API routes: throws AuthError instead of redirecting.
 * Callers should catch and return the appropriate response.
 */
export async function assertParent(): Promise<ParentSession> {
  const s = await getSession();
  if (!s) throw new AuthError("Not authenticated", 401);
  if (s.role !== "PARENT") throw new AuthError("Parent access required", 403);
  return s as ParentSession;
}

export async function assertChild(): Promise<ChildSession> {
  const s = await getSession();
  if (!s) throw new AuthError("Not authenticated", 401);
  if (s.role !== "CHILD" || !s.childId) throw new AuthError("Child access required", 403);
  return s as ChildSession;
}

/**
 * Server-action variant of requireSession: throws instead of redirecting so
 * actions can return a structured error response.
 */
export async function assertSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) throw new AuthError("Not authenticated", 401);
  return s;
}

/** Require that the calling child owns the given child profile id. */
export async function assertChildOwnership(childId: string): Promise<ChildSession> {
  const s = await assertChild();
  if (s.childId !== childId) throw new AuthError("Forbidden", 403);
  return s;
}
