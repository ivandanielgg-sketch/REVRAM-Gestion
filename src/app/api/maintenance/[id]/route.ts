import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { maintenanceSchema } from "@/lib/validations/schemas";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(request, "maintenance.view");
  if (error) return error;

  const { id } = await params;
  const order = await prisma.maintenanceOrder.findUnique({
    where: { id },
    include: {
      boiler: true,
      responsible: { select: { id: true, username: true } },
      alert: true,
      boilerLog: { select: { id: true, logDate: true } },
      evidence: true,
    },
  });
  if (!order) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requirePermission(request, "maintenance.manage");
  if (error || !session) return error;

  const { id } = await params;
  const existing = await prisma.maintenanceOrder.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const body = await request.json();
  const parsed = maintenanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const data = parsed.data;
  const order = await prisma.maintenanceOrder.update({
    where: { id },
    data: {
      type: data.type,
      priority: data.priority,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      responsibleId: data.responsibleId,
      description: data.description,
      finding: data.finding,
      actionTaken: data.actionTaken,
      partsUsed: data.partsUsed,
      status: data.status,
      closedAt: data.status === "CERRADA" ? new Date() : undefined,
    },
  });

  if (data.status === "CERRADA") {
    await createAuditLog({
      userId: session.id,
      action: "CERRAR_MANTENIMIENTO",
      module: "maintenance",
      recordId: id,
      ipAddress: getClientIp(request),
    });
  }

  return NextResponse.json(order);
}
