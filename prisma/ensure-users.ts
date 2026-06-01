import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import { getPgPoolConfig } from "../src/lib/db-pool";
import { ensureDefaultUsers } from "./ensure-default-users";

const pool = new pg.Pool(getPgPoolConfig(process.env.DATABASE_URL!));
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await ensureDefaultUsers(prisma);
  const count = await prisma.user.count({ where: { status: "ACTIVE", deletedAt: null } });
  console.log(`Usuarios base verificados. Total activos en BD: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
