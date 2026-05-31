import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";
import { companySchema } from "@/lib/validations/schemas";
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
  const parsed = companySchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const company = await prisma.company.update({
    where: { id },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.logoUrl !== undefined ? { logoUrl: parsed.data.logoUrl } : {}),
    },
    include: {
      _count: { select: { users: true, boilers: true } },
    },
  });

  await createAuditLog({
    userId: session.id,
    action: "EDITAR_REGISTRO",
    module: "admin/companies",
    recordId: id,
    newValue: company,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(company);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin(request);
  if (error) return error;

  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      users: {
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          lastLoginAt: true,
        },
      },
      boilers: { select: { id: true, name: true, internalId: true, status: true } },
      _count: { select: { users: true, boilers: true } },
    },
  });

  if (!company) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  return NextResponse.json(company);
}
