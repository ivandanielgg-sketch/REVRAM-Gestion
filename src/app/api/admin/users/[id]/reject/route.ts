import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/auth";
import { z } from "zod";

const rejectSchema = z.object({
  reason: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireSuperAdmin(request);
  if (error || !session) return error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = rejectSchema.safeParse(body);

  const user = await prisma.user.findUnique({ where: { id, deletedAt: null } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id },
    data: {
      status: "REJECTED",
      rejectionReason: parsed.success ? parsed.data.reason || null : null,
    },
  });

  await createAuditLog({
    userId: session.id,
    action: "RECHAZAR_REGISTRO",
    module: "admin/users",
    recordId: id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(updated);
}
