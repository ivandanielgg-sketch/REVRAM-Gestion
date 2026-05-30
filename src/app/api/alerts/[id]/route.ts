import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { closeAlertSchema } from "@/lib/validations/schemas";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requirePermission(request, "alerts.manage");
  if (error || !session) return error;

  const { id } = await params;
  const alert = await prisma.alert.findUnique({ where: { id } });
  if (!alert) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const body = await request.json();

  if (body.status === "EN_REVISION") {
    const updated = await prisma.alert.update({
      where: { id },
      data: { status: "EN_REVISION" },
    });
    return NextResponse.json(updated);
  }

  const parsed = closeAlertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  if (alert.severity === "CRITICO" && !parsed.data.closeComments.trim()) {
    return NextResponse.json(
      { error: "Comentario requerido para cerrar alerta crítica" },
      { status: 400 }
    );
  }

  const updated = await prisma.alert.update({
    where: { id },
    data: {
      status: "CERRADA",
      closeComments: parsed.data.closeComments,
      closedAt: new Date(),
    },
  });

  await createAuditLog({
    userId: session.id,
    action: "CERRAR_ALERTA",
    module: "alerts",
    recordId: id,
    previousValue: { status: alert.status },
    newValue: { status: "CERRADA", closeComments: parsed.data.closeComments },
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(updated);
}
