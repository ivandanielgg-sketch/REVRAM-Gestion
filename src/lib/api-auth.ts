import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";
import { hasPermission, Permission } from "@/lib/permissions";
import { UserRole } from "@/generated/prisma/client";

export async function requireAuth(request?: NextRequest) {
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
  if (!hasPermission(session.role as UserRole, permission)) {
    return { error: forbidden(), session: null };
  }
  return { error: null, session };
}
