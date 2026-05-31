import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyPermission } from "@/lib/api-auth";
import { userSchema } from "@/lib/validations/schemas";
import { hashPassword } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/auth";
import { companyFilter, isSuperAdmin } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  const { error, session } = await requireAnyPermission(request, [
    "users.manage",
    "users.manage_company",
  ]);
  if (error || !session) return error;

  const where = isSuperAdmin(session.role)
    ? { deletedAt: null }
    : { ...companyFilter(session), deletedAt: null };

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      status: true,
      companyId: true,
      company: { select: { name: true } },
      mustChangePassword: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { username: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireAnyPermission(request, [
    "users.manage",
    "users.manage_company",
  ]);
  if (error || !session) return error;

  const body = await request.json();
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  if (!parsed.data.password) {
    return NextResponse.json({ error: "Contraseña requerida" }, { status: 400 });
  }

  const companyId = parsed.data.companyId || session.companyId;
  if (!companyId && !isSuperAdmin(session.role)) {
    return NextResponse.json({ error: "Empresa requerida" }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      username: parsed.data.username,
      email: parsed.data.email,
      name: parsed.data.name || parsed.data.username,
      passwordHash,
      role: parsed.data.role,
      status: parsed.data.status || "ACTIVE",
      companyId,
    },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      status: true,
      companyId: true,
    },
  });

  await createAuditLog({
    userId: session.id,
    action: "CREAR_USUARIO",
    module: "users",
    recordId: user.id,
    newValue: user,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(user, { status: 201 });
}
