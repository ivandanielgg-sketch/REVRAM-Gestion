import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(request, "reports.view");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "daily";
  const boilerId = searchParams.get("boilerId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const dateFilter =
    startDate || endDate
      ? {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        }
      : undefined;

  if (type === "open-alerts") {
    const alerts = await prisma.alert.findMany({
      where: { status: { in: ["ABIERTA", "EN_REVISION"] }, ...(boilerId ? { boilerId } : {}) },
      include: { boiler: true, capturedBy: { select: { username: true } } },
      orderBy: { alertDate: "desc" },
    });
    return NextResponse.json({ alerts });
  }

  if (type === "pending-approval") {
    const logs = await prisma.boilerLog.findMany({
      where: { status: { in: ["ENVIADO", "REVISADO"] } },
      include: { boiler: true, operator: { select: { username: true } } },
      orderBy: { logDate: "desc" },
    });
    return NextResponse.json({ logs });
  }

  if (type === "critical-events") {
    const alerts = await prisma.alert.findMany({
      where: { severity: "CRITICO", ...(boilerId ? { boilerId } : {}) },
      include: { boiler: true },
      orderBy: { alertDate: "desc" },
      take: 50,
    });
    return NextResponse.json({ alerts });
  }

  if (type === "trends") {
    const logs = await prisma.boilerLog.findMany({
      where: {
        ...(boilerId ? { boilerId } : {}),
        ...(dateFilter ? { logDate: dateFilter } : {}),
        status: "APROBADO",
      },
      include: { combustion: true, waterTreatment: true },
      orderBy: { logDate: "asc" },
      take: 200,
    });

    const trends = logs.map((l) => ({
      date: l.logDate,
      steamPressure: l.steamPressure,
      flueGasTemperature: l.combustion?.flueGasTemperature,
      o2: l.combustion?.o2,
      co: l.combustion?.co,
      conductivity: l.waterTreatment?.conductivity,
      ph: l.waterTreatment?.ph,
    }));

    return NextResponse.json({ trends });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [logs, alerts, boilers] = await Promise.all([
    prisma.boilerLog.findMany({
      where: {
        logDate: { gte: today, lt: tomorrow },
        ...(boilerId ? { boilerId } : {}),
      },
      include: { boiler: true, operator: { select: { username: true } } },
    }),
    prisma.alert.findMany({
      where: {
        alertDate: { gte: today, lt: tomorrow },
        ...(boilerId ? { boilerId } : {}),
      },
    }),
    prisma.boiler.count({ where: { status: "OPERANDO" } }),
  ]);

  return NextResponse.json({
    summary: {
      logsToday: logs.length,
      alertsToday: alerts.length,
      boilersOperating: boilers,
    },
    logs,
    alerts,
  });
}
