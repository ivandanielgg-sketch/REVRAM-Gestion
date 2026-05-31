import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";
import { hasPermission, Permission } from "@/lib/permissions";
import { UserRole } from "@/generated/prisma/client";
import { canAccessAdmin, isSuperAdmin } from "@/lib/tenant";
import type { SessionUser } from "@/lib/session";

export async function requireAuth(request?: NextRequest): Promise<SessionUser | null> {
  const token = request?.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
}

export async function requirePermission(request: NextRequest, permission: Permission) {
  const session = await requireAuth(request);
  if (!session) return { error: unauthorized(), session: null };
  if (session.status !== "ACTIVE") return { error: forbidden(), session: null };
  if (!hasPermission(session.role as UserRole, permission)) {
    return { error: forbidden(), session: null };
  }
  return { error: null, session };
}

export async function requireAnyPermission(request: NextRequest, permissions: Permission[]) {
  const session = await requireAuth(request);
  if (!session) return { error: unauthorized(), session: null };
  if (session.status !== "ACTIVE") return { error: forbidden(), session: null };
  const allowed = permissions.some((p) => hasPermission(session.role as UserRole, p));
  if (!allowed) return { error: forbidden(), session: null };
  return { error: null, session };
}

export async function requireSuperAdmin(request: NextRequest) {
  const session = await requireAuth(request);
  if (!session) return { error: unauthorized(), session: null };
  if (!canAccessAdmin(session.role)) {
    return { error: forbidden(), session: null };
  }
  return { error: null, session };
}

export { isSuperAdmin };
