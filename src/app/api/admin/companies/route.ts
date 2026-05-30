import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";
import { companySchema } from "@/lib/validations/schemas";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { error } = await requireSuperAdmin(request);
  if (error) return error;

  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    include: {
      _count: {
        select: { users: true, boilers: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(companies);
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireSuperAdmin(request);
  if (error || !session) return error;

  const body = await request.json();
  const parsed = companySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const company = await prisma.company.create({
    data: {
      name: parsed.data.name.trim(),
      status: parsed.data.status || "ACTIVE",
    },
  });

  await createAuditLog({
    userId: session.id,
    action: "CREAR_REGISTRO",
    module: "admin/companies",
    recordId: company.id,
    newValue: company,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(company, { status: 201 });
}
