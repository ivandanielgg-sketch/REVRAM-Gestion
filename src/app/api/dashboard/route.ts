import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { companyFilter } from "@/lib/tenant";
import { mergeCompanyLogWhere, mergeCompanyAlertWhere } from "@/lib/tenant-access";

export async function GET(request: NextRequest) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const companyWhere = companyFilter(session);
  const logCompanyWhere = mergeCompanyLogWhere(session);
  const alertCompanyWhere = mergeCompanyAlertWhere(session);

  const [
    boilers,
    boilersOperating,
    recentLogs,
    openAlerts,
    pendingApproval,
    criticalAlerts,
  ] = await Promise.all([
    prisma.boiler.findMany({
      where: companyWhere,
      include: { plant: true, company: true },
      orderBy: { name: "asc" },
    }),
    prisma.boiler.count({ where: { ...companyWhere, status: "OPERANDO" } }),
    prisma.boilerLog.findMany({
      where: logCompanyWhere,
      take: 10,
      orderBy: { logDate: "desc" },
      include: {
        boiler: { select: { name: true } },
        operator: { select: { username: true, name: true } },
      },
    }),
    prisma.alert.findMany({
      where: {
        status: { in: ["ABIERTA", "EN_REVISION"] },
        ...alertCompanyWhere,
      },
      take: 10,
      orderBy: { alertDate: "desc" },
      include: { boiler: { select: { name: true } } },
    }),
    prisma.boilerLog.count({
      where: { status: { in: ["ENVIADO", "REVISADO"] }, ...logCompanyWhere },
    }),
    prisma.alert.count({
      where: { severity: "CRITICO", status: "ABIERTA", ...alertCompanyWhere },
    }),
  ]);

  return NextResponse.json({
    boilers,
    stats: {
      totalBoilers: boilers.length,
      boilersOperating,
      openAlerts: openAlerts.length,
      pendingApproval,
      criticalAlerts,
    },
    recentLogs,
    openAlerts,
  });
}
