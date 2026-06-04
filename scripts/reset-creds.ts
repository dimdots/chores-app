import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true, email: true },
  });
  console.log("Found users:", users);

  const pinHash = await bcrypt.hash("123456", 12);
  const passwordHash = await bcrypt.hash("test1234", 12);

  for (const u of users) {
    await prisma.user.update({
      where: { id: u.id },
      data: { pinHash, passwordHash: u.role === "PARENT" ? passwordHash : null },
    });
    console.log(`  reset: ${u.name} (${u.role}) — PIN=123456${u.role === "PARENT" ? `, password=test1234, email=${u.email}` : ""}`);
  }
}

main().finally(() => prisma.$disconnect());
