import type { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

/** Garantiza usuarios base del sistema (idempotente, seguro en cada deploy). */
export async function ensureDefaultUsers(prisma: PrismaClient): Promise<void> {
  const passwordHash = await bcrypt.hash("cambiar123", 12);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: { isActive: true },
    create: {
      username: "admin",
      email: "admin@example.com",
      passwordHash,
      role: "ADMINISTRADOR",
      mustChangePassword: true,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { username: "supervisor" },
    update: { isActive: true },
    create: {
      username: "supervisor",
      email: "supervisor@example.com",
      passwordHash: await bcrypt.hash("supervisor123", 12),
      role: "SUPERVISOR",
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { username: "operador" },
    update: { isActive: true },
    create: {
      username: "operador",
      email: "operador@example.com",
      passwordHash: await bcrypt.hash("operador123", 12),
      role: "OPERADOR",
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { username: "mantenimiento" },
    update: { isActive: true },
    create: {
      username: "mantenimiento",
      email: "mantenimiento@example.com",
      passwordHash: await bcrypt.hash("mantenimiento123", 12),
      role: "MANTENIMIENTO",
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { username: "consulta" },
    update: { isActive: true },
    create: {
      username: "consulta",
      email: "consulta@example.com",
      passwordHash: await bcrypt.hash("consulta123", 12),
      role: "SOLO_CONSULTA",
      isActive: true,
    },
  });
}
