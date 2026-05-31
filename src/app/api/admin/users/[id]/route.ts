import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";
import { adminUserUpdateSchema } from "@/lib/validations/schemas";
import { hashPassword } from "@/lib/auth";
import { ensureNotLastSuperAdmin } from "@/lib/admin-users";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireSuperAdmin(request);
  if (error || !session) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = adminUserUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const guard = await ensureNotLastSuperAdmin(id, {
    role: parsed.data.role,
    status: parsed.data.status,
  });
  if (guard) return NextResponse.json({ error: guard }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.email !== undefined) data.email = parsed.data.email.toLowerCase();
  if (parsed.data.role !== undefined) data.role = parsed.data.role;
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.companyId !== undefined) data.companyId = parsed.data.companyId;
  if (parsed.data.rejectionReason !== undefined) data.rejectionReason = parsed.data.rejectionReason;
  if (parsed.data.password) data.passwordHash = await hashPassword(parsed.data.password);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      companyId: true,
      company: { select: { name: true } },
    },
  });

  await createAuditLog({
    userId: session.id,
    action: "EDITAR_REGISTRO",
    module: "admin/users",
    recordId: id,
    newValue: user,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(user);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireSuperAdmin(request);
  if (error || !session) return error;

  const { id } = await params;
  if (id === session.id) {
    return NextResponse.json({ error: "No puede eliminarse a sí mismo." }, { status: 400 });
  }

  const guard = await ensureNotLastSuperAdmin(id, { status: "DELETED" });
  if (guard) return NextResponse.json({ error: guard }, { status: 400 });

  const user = await prisma.user.update({
    where: { id },
    data: { status: "DELETED", deletedAt: new Date() },
    select: { id: true, status: true },
  });

  await createAuditLog({
    userId: session.id,
    action: "EDITAR_REGISTRO",
    module: "admin/users",
    recordId: id,
    newValue: { deleted: true },
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(user);
}
