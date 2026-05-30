import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { userSchema } from "@/lib/validations/schemas";
import { hashPassword } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(request, "users.manage");
  if (error) return error;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { username: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const { error, session } = await requirePermission(request, "users.manage");
  if (error || !session) return error;

  const body = await request.json();
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  if (!parsed.data.password) {
    return NextResponse.json({ error: "Contraseña requerida" }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      username: parsed.data.username,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
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
