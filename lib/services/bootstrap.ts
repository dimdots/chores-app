import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { bootstrapSchema } from "@/lib/validators/auth";
import { seedDefaultCategoriesIfEmpty } from "@/lib/services/categories";
import { getT } from "@/lib/i18n/server";

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Returns true if the setup page should still be usable. */
export async function canBootstrap(): Promise<boolean> {
  if (!process.env.BOOTSTRAP_TOKEN) return false;
  const parentCount = await prisma.user.count({ where: { role: "PARENT" } });
  return parentCount === 0;
}

export async function bootstrapFirstParent(input: unknown): Promise<{ userId: string }> {
  const t = getT();
  const parsed = bootstrapSchema.safeParse(input);
  if (!parsed.success) throw new Error(t.errors.validation);

  const envToken = process.env.BOOTSTRAP_TOKEN;
  if (!envToken) throw new Error(t.setup.disabled);
  if (!constantTimeEquals(envToken, parsed.data.token)) {
    throw new Error(t.errors.invalidToken);
  }

  const parentCount = await prisma.user.count({ where: { role: "PARENT" } });
  if (parentCount > 0) throw new Error(t.errors.parentsExist);

  const passwordHash = await hashPassword(parsed.data.password);

  // Bootstrap creates the founding Family alongside the first parent. After
  // the multi-tenant pivot this path is only used by `npm run bootstrap` on
  // an empty DB — the in-product flow is /signup with an invite token.
  const created = await prisma.$transaction(async (tx) => {
    const family = await tx.family.create({
      data: { name: parsed.data.name, locale: "ru" },
    });
    const user = await tx.user.create({
      data: {
        familyId: family.id,
        role: "PARENT",
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        isActive: true,
      },
    });
    return { user, family };
  });

  // Seed default categories for the new family.
  await seedDefaultCategoriesIfEmpty(created.family.id);

  return { userId: created.user.id };
}
