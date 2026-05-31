import { UserRole } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/session";

export function isSuperAdmin(role: UserRole | string): boolean {
  return role === "SUPER_ADMIN";
}

export function canAccessAdmin(role: UserRole | string): boolean {
  return role === "SUPER_ADMIN";
}

export function companyFilter(session: SessionUser): { companyId: string } | Record<string, never> {
  if (isSuperAdmin(session.role)) return {};
  if (!session.companyId) return { companyId: "__none__" };
  return { companyId: session.companyId };
}

export function boilerCompanyFilter(session: SessionUser) {
  const filter = companyFilter(session);
  if ("companyId" in filter && filter.companyId === "__none__") {
    return { id: "__none__" };
  }
  return filter;
}

export function assertCompanyAccess(
  session: SessionUser,
  resourceCompanyId: string | null | undefined
): boolean {
  if (isSuperAdmin(session.role)) return true;
  if (!session.companyId || !resourceCompanyId) return false;
  return session.companyId === resourceCompanyId;
}
