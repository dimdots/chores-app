import type { Role } from "@prisma/client";

/** Shape of the signed JWT session payload. */
export type SessionPayload = {
  userId: string;
  /** Family tenant the user belongs to. Used to scope every query. */
  familyId: string;
  role: Role;
  /** Child profile id when role = CHILD, otherwise absent. */
  childId?: string;
  name: string;
};

export type ParentSession = SessionPayload & { role: "PARENT" };
export type ChildSession = SessionPayload & { role: "CHILD"; childId: string };
