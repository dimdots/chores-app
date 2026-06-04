import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n/server";

/**
 * Defense-in-depth: confirm a child profile belongs to the caller's family.
 * Action layer should call this before forwarding a `childId` from the
 * client into a service mutation (mark task complete, claim reward, etc.).
 * Throws a generic "not found" if mismatched — never leak that the resource
 * exists in another family.
 */
export async function assertChildInFamily(
  childId: string,
  familyId: string,
): Promise<void> {
  const t = getT();
  const child = await prisma.childProfile.findFirst({
    where: { id: childId, user: { familyId } },
    select: { id: true },
  });
  if (!child) throw new Error(t.errors.childNotFound);
}

/**
 * Confirm an arbitrary activity-log id belongs to the caller's family.
 * Used by the reaction-toggle path so a user can't react to another
 * family's feed entries by guessing ids.
 */
export async function assertActivityLogInFamily(
  activityLogId: string,
  familyId: string,
): Promise<void> {
  const t = getT();
  const log = await prisma.activityLog.findFirst({
    where: { id: activityLogId, familyId },
    select: { id: true },
  });
  if (!log) throw new Error(t.errors.notFound);
}
