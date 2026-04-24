/**
 * CLI to create the very first parent account without the web /setup flow.
 *
 * Usage:
 *   BOOTSTRAP_TOKEN=...  tsx scripts/bootstrap.ts \
 *     --email parent@example.com --password 'strong-pass' --name 'Папа'
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
      console.error("A parent already exists. Create more from /parent/settings.");
      process.exit(1);
    }
    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        role: "PARENT",
        name,
        email: email.toLowerCase(),
        passwordHash: hash,
        isActive: true,
      },
    });
    console.log("Created parent:", user.id, user.email);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
