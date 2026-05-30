import { prisma } from "@/lib/prisma";
import {
  aggregateTrendDataWithBucket,
  aggregateIncidentsWithBucket,
  parseDateParam,
  resolveDateRange,
  type TrendPeriod,
} from "@/lib/report-metrics";
import { buildChartLimits, limitsDescription } from "@/lib/operating-limit-bands";
import type { SessionUser } from "@/lib/session";
import { companyFilter } from "@/lib/tenant";
import { mergeCompanyAlertWhere, mergeCompanyLogWhere } from "@/lib/tenant-access";

export type ReportType =
  | "daily"
  | "open-alerts"
  | "pending-approval"
  | "critical-events"
  | "trends";

export interface ReportQuery {
  type: ReportType;
  boilerId?: string;
  period?: TrendPeriod;
  startDate?: string | null;
  endDate?: string | null;
  session?: SessionUser;
}

function dateFilter(startDate?: string | null, endDate?: string | null) {
  const start = parseDateParam(startDate);
  const end = parseDateParam(endDate, true);
  if (!start && !end) return undefined;
  return {
    ...(start ? { gte: start } : {}),
    ...(end ? { lte: end } : {}),
  };
}

export async function fetchReportData(query: ReportQuery) {
  const { type, boilerId, period = "week", startDate, endDate, session } = query;
  const boilerFilter = boilerId ? { boilerId } : {};
  const rangeFilter = dateFilter(startDate, endDate);
  const logTenant = session ? mergeCompanyLogWhere(session) : {};
  const alertTenant = session ? mergeCompanyAlertWhere(session) : {};
  const boilerTenant = session ? companyFilter(session) : {};

  if (type === "open-alerts") {
    const alerts = await prisma.alert.findMany({
      where: {
        status: { in: ["ABIERTA", "EN_REVISION"] },
        ...alertTenant,
        ...boilerFilter,
        ...(rangeFilter ? { alertDate: rangeFilter } : {}),
      },
      include: { boiler: true, capturedBy: { select: { username: true, name: true } } },
      orderBy: { alertDate: "desc" },
    });
    return { type, alerts, total: alerts.length, startDate, endDate };
  }

  if (type === "pending-approval") {
    const logs = await prisma.boilerLog.findMany({
      where: {
        status: { in: ["ENVIADO", "REVISADO"] },
        ...logTenant,
        ...(boilerId ? { boilerId } : {}),
        ...(rangeFilter ? { logDate: rangeFilter } : {}),
      },
      include: { boiler: true, operator: { select: { username: true, name: true } } },
      orderBy: { logDate: "desc" },
    });
    return { type, logs, total: logs.length, startDate, endDate };
  }

  if (type === "critical-events") {
    const alerts = await prisma.alert.findMany({
      where: {
        severity: "CRITICO",
        ...alertTenant,
        ...boilerFilter,
        ...(rangeFilter ? { alertDate: rangeFilter } : {}),
      },
      include: { boiler: true, capturedBy: { select: { username: true, name: true } } },
      orderBy: { alertDate: "desc" },
      take: 500,
    });
    return { type, alerts, total: alerts.length, startDate, endDate };
  }

  if (type === "trends") {
    const { start, end, bucket } = resolveDateRange(period, startDate, endDate);

    const logs = await prisma.boilerLog.findMany({
      where: {
        ...logTenant,
        ...boilerFilter,
        logDate: { gte: start, lte: end },
        status: { in: ["APROBADO", "REVISADO", "ENVIADO"] },
      },
      include: { combustion: true, waterTreatment: true },
      orderBy: { logDate: "asc" },
    });

    const alerts = await prisma.alert.findMany({
      where: {
        ...alertTenant,
        ...boilerFilter,
        alertDate: { gte: start, lte: end },
      },
      select: { alertDate: true, severity: true },
      orderBy: { alertDate: "asc" },
    });

    const trends = aggregateTrendDataWithBucket(logs, bucket);
    const incidents = aggregateIncidentsWithBucket(alerts, bucket);

    const limitsRows = await prisma.boilerOperatingLimit.findMany({
      where: boilerId
        ? { boilerId, boiler: boilerTenant }
        : Object.keys(boilerTenant).length
          ? { boiler: boilerTenant }
          : {},
      include: { boiler: { select: { name: true } } },
    });

    const operatingLimits = buildChartLimits(limitsRows);
    const limitsLabel = limitsDescription(
      limitsRows.length,
      limitsRows.length === 1 ? limitsRows[0].boiler.name : undefined
    );

    return {
      type,
      period,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      trends,
      incidents,
      operatingLimits,
      limitsLabel,
      recordCount: logs.length,
      totalIncidents: alerts.length,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const logDateFilter = rangeFilter ?? { gte: today, lt: tomorrow };
  const alertDateFilter = rangeFilter ?? { gte: today, lt: tomorrow };

  const [logs, alerts, boilersOperating] = await Promise.all([
    prisma.boilerLog.findMany({
      where: { logDate: logDateFilter, ...logTenant, ...boilerFilter },
      include: {
        boiler: true,
        operator: { select: { username: true, name: true } },
        combustion: true,
        waterTreatment: true,
      },
      orderBy: { logDate: "desc" },
    }),
    prisma.alert.findMany({
      where: { alertDate: alertDateFilter, ...alertTenant, ...boilerFilter },
      include: { boiler: true, capturedBy: { select: { username: true, name: true } } },
      orderBy: { alertDate: "desc" },
    }),
    prisma.boiler.count({ where: { status: "OPERANDO", ...boilerTenant } }),
  ]);

  const openAlerts = alerts.filter(
    (a) => a.status === "ABIERTA" || a.status === "EN_REVISION"
  ).length;
  const criticalAlerts = alerts.filter((a) => a.severity === "CRITICO").length;

  return {
    type: "daily" as const,
    date: rangeFilter ? startDate : today.toISOString(),
    startDate: startDate ?? today.toISOString().slice(0, 10),
    endDate: endDate ?? today.toISOString().slice(0, 10),
    summary: {
      logsToday: logs.length,
      alertsToday: alerts.length,
      openAlerts,
      criticalAlerts,
      boilersOperating,
    },
    logs,
    alerts,
  };
}
