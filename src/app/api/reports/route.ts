import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import {
  aggregateTrendData,
  getPeriodRange,
  type TrendPeriod,
} from "@/lib/report-metrics";

const VALID_PERIODS: TrendPeriod[] = ["day", "week", "month", "year"];

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(request, "reports.view");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "daily";
  const boilerId = searchParams.get("boilerId") || undefined;
  const periodParam = searchParams.get("period") || "week";
  const period = VALID_PERIODS.includes(periodParam as TrendPeriod)
    ? (periodParam as TrendPeriod)
    : "week";

  const boilerFilter = boilerId ? { boilerId } : {};

  if (type === "open-alerts") {
    const alerts = await prisma.alert.findMany({
      where: { status: { in: ["ABIERTA", "EN_REVISION"] }, ...boilerFilter },
      include: { boiler: true, capturedBy: { select: { username: true } } },
      orderBy: { alertDate: "desc" },
    });
    return NextResponse.json({ type, alerts, total: alerts.length });
  }

  if (type === "pending-approval") {
    const logs = await prisma.boilerLog.findMany({
      where: {
        status: { in: ["ENVIADO", "REVISADO"] },
        ...(boilerId ? { boilerId } : {}),
      },
      include: { boiler: true, operator: { select: { username: true } } },
      orderBy: { logDate: "desc" },
    });
    return NextResponse.json({ type, logs, total: logs.length });
  }

  if (type === "critical-events") {
    const alerts = await prisma.alert.findMany({
      where: { severity: "CRITICO", ...boilerFilter },
      include: { boiler: true, capturedBy: { select: { username: true } } },
      orderBy: { alertDate: "desc" },
      take: 100,
    });
    return NextResponse.json({ type, alerts, total: alerts.length });
  }

  if (type === "trends") {
    const { start, end } = getPeriodRange(period);

    const logs = await prisma.boilerLog.findMany({
      where: {
        ...boilerFilter,
        logDate: { gte: start, lte: end },
        status: { in: ["APROBADO", "REVISADO", "ENVIADO"] },
      },
      include: { combustion: true, waterTreatment: true },
      orderBy: { logDate: "asc" },
    });

    const trends = aggregateTrendData(logs, period);

    return NextResponse.json({
      type,
      period,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      trends,
      recordCount: logs.length,
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [logs, alerts, boilersOperating] = await Promise.all([
    prisma.boilerLog.findMany({
      where: {
        logDate: { gte: today, lt: tomorrow },
        ...boilerFilter,
      },
      include: {
        boiler: true,
        operator: { select: { username: true } },
        combustion: true,
        waterTreatment: true,
      },
      orderBy: { logDate: "desc" },
    }),
    prisma.alert.findMany({
      where: {
        alertDate: { gte: today, lt: tomorrow },
        ...boilerFilter,
      },
      include: { boiler: true, capturedBy: { select: { username: true } } },
      orderBy: { alertDate: "desc" },
    }),
    prisma.boiler.count({ where: { status: "OPERANDO" } }),
  ]);

  const openAlerts = alerts.filter((a) => a.status === "ABIERTA" || a.status === "EN_REVISION").length;
  const criticalAlerts = alerts.filter((a) => a.severity === "CRITICO").length;

  return NextResponse.json({
    type: "daily",
    date: today.toISOString(),
    summary: {
      logsToday: logs.length,
      alertsToday: alerts.length,
      openAlerts,
      criticalAlerts,
      boilersOperating,
    },
    logs,
    alerts,
  });
}
