import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { plantUpdateSchema } from "@/lib/validations/schemas";
import { assertCompanyAccess, isSuperAdmin } from "@/lib/tenant";
import { normalizePlantName, PLANT_DUPLICATE_ERROR } from "@/lib/plant-utils";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/auth";

async function getPlantForSession(id: string, session: { role: string; companyId: string | null }) {
  const plant = await prisma.plant.findFirst({
    where: { id, deletedAt: null },
    include: {
      company: { select: { id: true, name: true } },
      _count: { select: { boilers: true } },
    },
  });
  if (!plant) return null;
  if (!assertCompanyAccess(session as Parameters<typeof assertCompanyAccess>[0], plant.companyId)) {
    return null;
  }
  return plant;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requirePermission(request, "settings.manage");
  if (error || !session) return error;

  const { id } = await params;
  const plant = await getPlantForSession(id, session);
  if (!plant) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json(plant);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requirePermission(request, "settings.manage");
  if (error || !session) return error;

  const { id } = await params;
  const existing = await getPlantForSession(id, session);
  if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const body = await request.json();
  const parsed = plantUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) {
    updateData.name = data.name.trim();
    updateData.normalizedName = normalizePlantName(data.name);
  }
  if (data.client !== undefined) updateData.client = data.client?.trim() || null;
  if (data.location !== undefined) updateData.location = data.location?.trim() || null;
  if (data.address !== undefined) updateData.address = data.address?.trim() || null;
  if (data.contact !== undefined) updateData.contact = data.contact?.trim() || null;
  if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
  if (data.email !== undefined) updateData.email = data.email?.trim() || null;
  if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
  if (data.status !== undefined) updateData.status = data.status;

  try {
    const plant = await prisma.plant.update({
      where: { id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { boilers: true } },
      },
    });

    await createAuditLog({
      userId: session.id,
      action: "EDITAR_REGISTRO",
      module: "plants",
      recordId: id,
      previousValue: existing,
      newValue: plant,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json(plant);
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ error: PLANT_DUPLICATE_ERROR }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requirePermission(request, "settings.manage");
  if (error || !session) return error;

  const { id } = await params;
  const existing = await getPlantForSession(id, session);
  if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const [boilerCount, logCount, alertCount, maintenanceCount] = await Promise.all([
    prisma.boiler.count({ where: { plantId: id } }),
    prisma.boilerLog.count({ where: { boiler: { plantId: id } } }),
    prisma.alert.count({ where: { boiler: { plantId: id } } }),
    prisma.maintenanceOrder.count({ where: { boiler: { plantId: id } } }),
  ]);

  const hasAssociations = boilerCount + logCount + alertCount + maintenanceCount > 0;

  if (hasAssociations) {
    const plant = await prisma.plant.update({
      where: { id },
      data: { status: "DISABLED", deletedAt: new Date() },
    });
    return NextResponse.json({ message: "Planta desactivada (tiene registros asociados)", plant });
  }

  await prisma.plant.update({
    where: { id },
    data: { deletedAt: new Date(), status: "DISABLED" },
  });

  await createAuditLog({
    userId: session.id,
    action: "EDITAR_REGISTRO",
    module: "plants",
    recordId: id,
    previousValue: existing,
    newValue: { deletedAt: new Date() },
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ message: "Planta eliminada" });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requirePermission(request, "settings.manage");
  if (error || !session) return error;

  const { id } = await params;
  const existing = await getPlantForSession(id, session);
  if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const plant = await prisma.plant.update({
    where: { id },
    data: { status: "DISABLED" },
    include: {
      company: { select: { id: true, name: true } },
      _count: { select: { boilers: true } },
    },
  });

  return NextResponse.json(plant);
}
