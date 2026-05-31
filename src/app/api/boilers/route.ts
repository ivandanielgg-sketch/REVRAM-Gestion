import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { boilerSchema } from "@/lib/validations/schemas";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/auth";
import { companyFilter } from "@/lib/tenant";
import { assertPlantBelongsToCompany, resolveTargetCompanyId } from "@/lib/security";

export async function GET(request: NextRequest) {
  const { error, session } = await requirePermission(request, "boilers.view");
  if (error || !session) return error;

  const boilers = await prisma.boiler.findMany({
    where: companyFilter(session),
    include: { plant: true, operatingLimits: true, company: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(boilers);
}

export async function POST(request: NextRequest) {
  const { error, session } = await requirePermission(request, "boilers.manage");
  if (error || !session) return error;

  const body = await request.json();
  const parsed = boilerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const targetCompanyId = resolveTargetCompanyId(session, parsed.data.companyId);
  if (!targetCompanyId) {
    return NextResponse.json({ error: "Empresa requerida" }, { status: 400 });
  }

  if (!(await assertPlantBelongsToCompany(parsed.data.plantId, targetCompanyId))) {
    return NextResponse.json({ error: "Planta no pertenece a su empresa" }, { status: 403 });
  }

  const data = parsed.data;
  const boiler = await prisma.boiler.create({
    data: {
      ...data,
      companyId: targetCompanyId,
      installationDate: data.installationDate ? new Date(data.installationDate) : null,
      lastInspectionDate: data.lastInspectionDate ? new Date(data.lastInspectionDate) : null,
      nextInspectionDate: data.nextInspectionDate ? new Date(data.nextInspectionDate) : null,
    },
    include: { plant: true, company: true },
  });

  await createAuditLog({
    userId: session.id,
    action: "CREAR_REGISTRO",
    module: "boilers",
    recordId: boiler.id,
    newValue: boiler,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(boiler, { status: 201 });
}
