/**
 * CLI to create the very first parent + family on an empty database.
 *
 * Usage:
 *   tsx scripts/bootstrap.ts --email parent@example.com --password 'strong-pass' --name 'Папа'
 *
 * If you're adding a *second* family to an existing deployment, don't use
 * this — use `tsx scripts/create-family-invite.ts` and the /signup flow.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

type Args = { email?: string; password?: string; name?: string };

function parseArgs(): Args {
  const out: Args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--email") out.email = argv[++i];
    else if (a === "--password") out.password = argv[++i];
    else if (a === "--name") out.name = argv[++i];
  }
  return out;
}

async function main() {
  const { email, password, name } = parseArgs();
  if (!email || !password || !name) {
    console.error("Missing --email / --password / --name");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const count = await prisma.user.count({ where: { role: "PARENT" } });
    if (count > 0) {
      console.error("A parent already exists. Use scripts/create-family-invite.ts to add a second family.");
      process.exit(1);
    }
    const hash = await bcrypt.hash(password, 12);
    const result = await prisma.$transaction(async (tx) => {
      const family = await tx.family.create({
        data: { name, locale: "ru" },
      });
      const user = await tx.user.create({
        data: {
          familyId: family.id,
          role: "PARENT",
          name,
          email: email.toLowerCase(),
          passwordHash: hash,
          isActive: true,
        },
      });
      return { family, user };
    });
    console.log("Created family:", result.family.id, result.family.name);
    console.log("Created parent:", result.user.id, result.user.email);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
