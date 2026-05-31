import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { Prisma } from "@/generated/prisma/client";
import { mergeCompanyAlertWhere } from "@/lib/tenant-access";

export async function GET(request: NextRequest) {
  const { error, session } = await requirePermission(request, "alerts.view");
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const severity = searchParams.get("severity");
  const boilerId = searchParams.get("boilerId");

  const where: Prisma.AlertWhereInput = { ...mergeCompanyAlertWhere(session) };
  if (status) where.status = status as Prisma.EnumAlertStatusFilter["equals"];
  if (severity) where.severity = severity as Prisma.EnumAlertSeverityFilter["equals"];
  if (boilerId) where.boilerId = boilerId;

  const alerts = await prisma.alert.findMany({
    where,
    include: {
      boiler: { select: { id: true, name: true, internalId: true, companyId: true } },
      capturedBy: { select: { id: true, username: true, name: true } },
      boilerLog: { select: { id: true, logDate: true } },
    },
    orderBy: { alertDate: "desc" },
    take: 200,
  });

  return NextResponse.json(alerts);
}
