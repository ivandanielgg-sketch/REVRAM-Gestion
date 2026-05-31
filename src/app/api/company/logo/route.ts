import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { companyLogoSchema } from "@/lib/validations/schemas";
import { assertLogoCompanyAccess, canManageCompanyLogo } from "@/lib/security";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const companyId = session.companyId;
  if (!companyId && session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ logoUrl: null, companyName: session.companyName });
  }

  if (!companyId) {
    return NextResponse.json({ logoUrl: null, companyName: null });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { logoUrl: true, name: true },
  });

  return NextResponse.json({
    logoUrl: company?.logoUrl ?? null,
    companyName: company?.name ?? session.companyName,
  });
}

export async function PUT(request: NextRequest) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!canManageCompanyLogo(session)) {
    return NextResponse.json({ error: "No tiene permiso para cambiar el logo" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = companyLogoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const targetCompanyId = body.companyId || session.companyId;
  if (!targetCompanyId) {
    return NextResponse.json({ error: "Empresa requerida" }, { status: 400 });
  }

  if (!assertLogoCompanyAccess(session, targetCompanyId)) {
    return NextResponse.json({ error: "Acceso denegado a esta empresa" }, { status: 403 });
  }

  const company = await prisma.company.update({
    where: { id: targetCompanyId },
    data: { logoUrl: parsed.data.logoUrl },
    select: { id: true, name: true, logoUrl: true },
  });

  await createAuditLog({
    userId: session.id,
    action: "EDITAR_REGISTRO",
    module: "company-logo",
    recordId: company.id,
    newValue: { logoUrl: company.logoUrl },
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(company);
}
