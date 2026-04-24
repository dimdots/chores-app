import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { bootstrapSchema } from "@/lib/validators/auth";
import { seedDefaultCategoriesIfEmpty } from "@/lib/services/categories";
import { t } from "@/lib/i18n/ru";

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
  const created = await prisma.user.create({
    data: {
      role: "PARENT",
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      isActive: true,
    },
  });

  // Seed default categories on first setup if the table is empty.
  await seedDefaultCategoriesIfEmpty();

  return { userId: created.id };
}
