import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyPermission } from "@/lib/api-auth";
import { userSchema } from "@/lib/validations/schemas";
import { hashPassword } from "@/lib/auth";
import { assertCompanyAccess, isSuperAdmin } from "@/lib/tenant";
import { assertRoleAssignableBySession } from "@/lib/security";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAnyPermission(request, [
    "users.manage",
    "users.manage_company",
  ]);
  if (error || !session) return error;

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id, deletedAt: null } });
  if (!target) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (!isSuperAdmin(session.role) && !assertCompanyAccess(session, target.companyId)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = userSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.username !== undefined) data.username = parsed.data.username;
  if (parsed.data.email !== undefined) data.email = parsed.data.email;
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.role !== undefined) {
    const roleCheck = assertRoleAssignableBySession(session, parsed.data.role);
    if (!roleCheck.ok) {
      return NextResponse.json({ error: roleCheck.error }, { status: 403 });
    }
    if (parsed.data.role === "SUPER_ADMIN" && target.id !== session.id && !isSuperAdmin(session.role)) {
      return NextResponse.json({ error: "No puede asignar rol SUPER_ADMIN" }, { status: 403 });
    }
    data.role = parsed.data.role;
  }
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.companyId !== undefined && isSuperAdmin(session.role)) {
    data.companyId = parsed.data.companyId;
  }
  if (parsed.data.password) {
    data.passwordHash = await hashPassword(parsed.data.password);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
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

  return NextResponse.json(user);
}
