import type { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const REVRAM_COMPANY_ID = "revram-company-001";

/** Garantiza usuarios base del sistema (idempotente, seguro en cada deploy). */
export async function ensureDefaultUsers(prisma: PrismaClient): Promise<void> {
  await prisma.company.upsert({
    where: { id: REVRAM_COMPANY_ID },
    update: { name: "REVRAM", status: "ACTIVE", deletedAt: null },
    create: { id: REVRAM_COMPANY_ID, name: "REVRAM", status: "ACTIVE" },
  });

  const passwordHash = await bcrypt.hash("cambiar123", 12);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      status: "ACTIVE",
      role: "SUPER_ADMIN",
      companyId: REVRAM_COMPANY_ID,
      email: "admin@revram.mx",
      name: "Administrador REVRAM",
    },
    create: {
      username: "admin",
      email: "admin@revram.mx",
      name: "Administrador REVRAM",
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      companyId: REVRAM_COMPANY_ID,
      mustChangePassword: true,
    },
  });

  await prisma.user.upsert({
    where: { username: "supervisor" },
    update: { status: "ACTIVE", companyId: REVRAM_COMPANY_ID },
    create: {
      username: "supervisor",
      email: "supervisor@example.com",
      name: "Supervisor Demo",
      passwordHash: await bcrypt.hash("supervisor123", 12),
      role: "SUPERVISOR",
      status: "ACTIVE",
      companyId: REVRAM_COMPANY_ID,
    },
  });

  await prisma.user.upsert({
    where: { username: "operador" },
    update: { status: "ACTIVE", companyId: REVRAM_COMPANY_ID },
    create: {
      username: "operador",
      email: "operador@example.com",
      name: "Operador Demo",
      passwordHash: await bcrypt.hash("operador123", 12),
      role: "OPERATOR",
      status: "ACTIVE",
      companyId: REVRAM_COMPANY_ID,
    },
  });

  await prisma.user.upsert({
    where: { username: "mantenimiento" },
    update: { status: "ACTIVE", companyId: REVRAM_COMPANY_ID },
    create: {
      username: "mantenimiento",
      email: "mantenimiento@example.com",
      name: "Mantenimiento Demo",
      passwordHash: await bcrypt.hash("mantenimiento123", 12),
      role: "MAINTENANCE",
      status: "ACTIVE",
      companyId: REVRAM_COMPANY_ID,
    },
  });

  await prisma.user.upsert({
    where: { username: "consulta" },
    update: { status: "ACTIVE", companyId: REVRAM_COMPANY_ID },
    create: {
      username: "consulta",
      email: "consulta@example.com",
      name: "Consulta Demo",
      passwordHash: await bcrypt.hash("consulta123", 12),
      role: "VIEWER",
      status: "ACTIVE",
      companyId: REVRAM_COMPANY_ID,
    },
  });
}
