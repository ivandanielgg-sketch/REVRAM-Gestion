import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { boilerSchema, operatingLimitsSchema } from "@/lib/validations/schemas";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/auth";
import { getBoilerForSession } from "@/lib/tenant-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requirePermission(request, "boilers.view");
  if (error || !session) return error;

  const { id } = await params;
  const boiler = await getBoilerForSession(id, session);
  if (!boiler) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json(boiler);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requirePermission(request, "boilers.manage");
  if (error || !session) return error;

  const { id } = await params;
  const existing = await getBoilerForSession(id, session);
  if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const body = await request.json();
  const parsed = boilerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const data = parsed.data;
  const boiler = await prisma.boiler.update({
    where: { id },
    data: {
      ...data,
      companyId: existing.companyId,
      installationDate: data.installationDate ? new Date(data.installationDate) : null,
      lastInspectionDate: data.lastInspectionDate ? new Date(data.lastInspectionDate) : null,
      nextInspectionDate: data.nextInspectionDate ? new Date(data.nextInspectionDate) : null,
    },
    include: { plant: true, operatingLimits: true, company: true },
  });

  await createAuditLog({
    userId: session.id,
    action: "EDITAR_REGISTRO",
    module: "boilers",
    recordId: id,
    previousValue: existing,
    newValue: boiler,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(boiler);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requirePermission(request, "boilers.manage");
  if (error || !session) return error;

  const { id } = await params;
  const boiler = await getBoilerForSession(id, session);
  if (!boiler) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const body = await request.json();
  const parsed = operatingLimitsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const previous = await prisma.boilerOperatingLimit.findUnique({ where: { boilerId: id } });
  const limits = await prisma.boilerOperatingLimit.upsert({
    where: { boilerId: id },
    create: { boilerId: id, ...parsed.data },
    update: parsed.data,
  });

  await createAuditLog({
    userId: session.id,
    action: "CAMBIAR_LIMITES_CALDERA",
    module: "boilers",
    recordId: id,
    previousValue: previous,
    newValue: limits,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(limits);
}
