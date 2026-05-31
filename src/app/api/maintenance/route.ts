import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { maintenanceSchema } from "@/lib/validations/schemas";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/auth";
import { generateOrderNumber } from "@/lib/utils";
import { Prisma } from "@/generated/prisma/client";
import { getBoilerForSession, mergeCompanyMaintenanceWhere } from "@/lib/tenant-access";

export async function GET(request: NextRequest) {
  const { error, session } = await requirePermission(request, "maintenance.view");
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const boilerId = searchParams.get("boilerId");

  const where: Prisma.MaintenanceOrderWhereInput = { ...mergeCompanyMaintenanceWhere(session) };
  if (status) where.status = status as Prisma.EnumMaintenanceStatusFilter["equals"];
  if (boilerId) where.boilerId = boilerId;

  const orders = await prisma.maintenanceOrder.findMany({
    where,
    include: {
      boiler: { select: { id: true, name: true } },
      responsible: { select: { id: true, username: true, name: true } },
      alert: { select: { id: true, parameter: true, severity: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}

export async function POST(request: NextRequest) {
  const { error, session } = await requirePermission(request, "maintenance.manage");
  if (error || !session) return error;

  const body = await request.json();
  const parsed = maintenanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const boiler = await getBoilerForSession(parsed.data.boilerId, session);
  if (!boiler) {
    return NextResponse.json({ error: "Caldera no encontrada o sin acceso" }, { status: 403 });
  }

  const data = parsed.data;
  const order = await prisma.maintenanceOrder.create({
    data: {
      orderNumber: generateOrderNumber(),
      boilerId: data.boilerId,
      type: data.type,
      priority: data.priority,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      responsibleId: data.responsibleId,
      description: data.description,
      finding: data.finding,
      actionTaken: data.actionTaken,
      partsUsed: data.partsUsed,
      status: data.status || "ABIERTA",
      alertId: data.alertId,
      boilerLogId: data.boilerLogId,
    },
    include: { boiler: true },
  });

  await createAuditLog({
    userId: session.id,
    action: "CREAR_MANTENIMIENTO",
    module: "maintenance",
    recordId: order.id,
    newValue: order,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(order, { status: 201 });
}
