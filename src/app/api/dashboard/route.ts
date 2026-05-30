import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [
    boilers,
    boilersOperating,
    recentLogs,
    openAlerts,
    pendingApproval,
    criticalAlerts,
  ] = await Promise.all([
    prisma.boiler.findMany({
      include: { plant: true },
      orderBy: { name: "asc" },
    }),
    prisma.boiler.count({ where: { status: "OPERANDO" } }),
    prisma.boilerLog.findMany({
      take: 10,
      orderBy: { logDate: "desc" },
      include: {
        boiler: { select: { name: true } },
        operator: { select: { username: true } },
      },
    }),
    prisma.alert.findMany({
      where: { status: { in: ["ABIERTA", "EN_REVISION"] } },
      take: 10,
      orderBy: { alertDate: "desc" },
      include: { boiler: { select: { name: true } } },
    }),
    prisma.boilerLog.count({ where: { status: { in: ["ENVIADO", "REVISADO"] } } }),
    prisma.alert.count({ where: { severity: "CRITICO", status: "ABIERTA" } }),
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
