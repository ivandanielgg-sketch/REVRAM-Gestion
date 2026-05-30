import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import bcrypt from "bcryptjs";
import { getPgPoolConfig } from "../src/lib/db-pool";

const DEFAULT_PASSWORD = "cambiar123";

async function main() {
  const pool = new pg.Pool(getPgPoolConfig(process.env.DATABASE_URL!));
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  const user = await prisma.user.update({
    where: { username: "admin" },
    data: {
      passwordHash,
      mustChangePassword: true,
      isActive: true,
      passwordChangedAt: null,
    },
  });

  console.log(`Admin "${user.username}" restablecido. Contraseña: ${DEFAULT_PASSWORD}`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
