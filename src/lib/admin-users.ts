import { prisma } from "@/lib/prisma";
import { UserRole, UserStatus, Prisma } from "@/generated/prisma/client";

export async function countSuperAdmins(excludeId?: string): Promise<number> {
  return prisma.user.count({
    where: {
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

export async function ensureNotLastSuperAdmin(userId: string, updates: { role?: UserRole; status?: UserStatus }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "SUPER_ADMIN") return null;

  const demoting =
    (updates.role && updates.role !== "SUPER_ADMIN") ||
    (updates.status && updates.status !== "ACTIVE");

  if (demoting) {
    const others = await countSuperAdmins(userId);
    if (others === 0) {
      return "No se puede modificar al último administrador global activo.";
    }
  }
  return null;
}

export interface AdminUsersQuery {
  status?: string | null;
  companyId?: string | null;
  role?: string | null;
  email?: string | null;
}

export function buildAdminUsersWhere(query: AdminUsersQuery): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = { deletedAt: null };

  if (query.status && query.status !== "all") {
    where.status = query.status as UserStatus;
  }
  if (query.companyId) where.companyId = query.companyId;
  if (query.role) where.role = query.role as UserRole;
  if (query.email) {
    where.email = { contains: query.email, mode: "insensitive" };
  }

  return where;
}
