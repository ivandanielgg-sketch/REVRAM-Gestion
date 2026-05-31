import type { SessionUser } from "@/lib/session";
import { assertCompanyAccess, isSuperAdmin } from "@/lib/tenant";
import { companyAssignableRoles } from "@/lib/validations/schemas";
import { prisma } from "@/lib/prisma";

export function resolveTargetCompanyId(
  session: SessionUser,
  requestedCompanyId?: string | null
): string | null {
  if (isSuperAdmin(session.role)) {
    return requestedCompanyId || session.companyId || null;
  }
  return session.companyId;
}

export function assertRoleAssignableBySession(
  session: SessionUser,
  role: string
): { ok: true } | { ok: false; error: string } {
  if (role === "SUPER_ADMIN" && !isSuperAdmin(session.role)) {
    return { ok: false, error: "No puede asignar rol SUPER_ADMIN" };
  }
  if (!isSuperAdmin(session.role) && !companyAssignableRoles.includes(role as (typeof companyAssignableRoles)[number])) {
    return { ok: false, error: "Rol no permitido para su empresa" };
  }
  return { ok: true };
}

export async function assertPlantBelongsToCompany(
  plantId: string | null | undefined,
  companyId: string | null
): Promise<boolean> {
  if (!plantId) return true;
  if (!companyId) return false;
  const plant = await prisma.plant.findFirst({
    where: { id: plantId, companyId, deletedAt: null, status: "ACTIVE" },
  });
  return !!plant;
}

export async function assertUserBelongsToCompany(
  userId: string,
  companyId: string | null
): Promise<boolean> {
  if (!companyId) return false;
  const user = await prisma.user.findFirst({
    where: { id: userId, companyId, deletedAt: null, status: "ACTIVE" },
  });
  return !!user;
}

export async function assertBoilerBelongsToSession(
  boilerId: string,
  session: SessionUser
): Promise<boolean> {
  const boiler = await prisma.boiler.findUnique({
    where: { id: boilerId },
    select: { companyId: true },
  });
  if (!boiler) return false;
  return assertCompanyAccess(session, boiler.companyId);
}

export function canManageCompanyLogo(session: SessionUser): boolean {
  return session.role === "SUPER_ADMIN" || session.role === "COMPANY_ADMIN";
}

export function assertLogoCompanyAccess(
  session: SessionUser,
  targetCompanyId: string
): boolean {
  if (session.role === "SUPER_ADMIN") return true;
  if (session.role === "COMPANY_ADMIN") return session.companyId === targetCompanyId;
  return false;
}
