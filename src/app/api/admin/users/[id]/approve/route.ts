import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireSuperAdmin(request);
  if (error || !session) return error;

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id, deletedAt: null } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id },
    data: {
      status: "ACTIVE",
      rejectionReason: null,
      role: user.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : user.role === "VIEWER" ? "OPERATOR" : user.role,
    },
    include: { company: { select: { id: true, name: true } } },
  });

  await createAuditLog({
    userId: session.id,
    action: "APROBAR_REGISTRO",
    module: "admin/users",
    recordId: id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(updated);
}
