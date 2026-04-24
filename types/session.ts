import type { Role } from "@prisma/client";

/** Shape of the signed JWT session payload. */
export type SessionPayload = {
  userId: string;
  role: Role;
  /** Child profile id when role = CHILD, otherwise absent. */
  childId?: string;
  name: string;
};

export type ParentSession = SessionPayload & { role: "PARENT" };
export type ChildSession = SessionPayload & { role: "CHILD"; childId: string };
