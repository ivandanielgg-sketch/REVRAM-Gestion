import { formatDate } from "@/lib/utils";
import { ALERT_SEVERITY_LABELS, LOG_STATUS_LABELS } from "@/lib/constants";
import { TREND_METRICS, PERIOD_LABELS, type TrendPeriod } from "@/lib/report-metrics";
import {
  packageExport,
  type ExportFormat,
  type ExportSheet,
} from "@/lib/export-utils";

type ReportExportFormat = ExportFormat;

function reportTitle(type: string): string {
  const titles: Record<string, string> = {
    daily: "Resumen diario",
    trends: "Tendencias de parámetros",
    "open-alerts": "Alertas abiertas",
    "pending-approval": "Pendientes de aprobación",
    "critical-events": "Eventos críticos",
  };
  return titles[type] || "Reporte";
}

function buildSheets(data: Record<string, unknown>): ExportSheet[] {
  const sheets: ExportSheet[] = [];
  const type = data.type as string;

  if (type === "daily" && data.summary) {
    const summary = data.summary as Record<string, number>;
    sheets.push({
      name: "Resumen",
      headers: ["Indicador", "Valor"],
      rows: [
        ["Bitácoras", summary.logsToday],
        ["Alertas", summary.alertsToday],
        ["Alertas abiertas", summary.openAlerts],
        ["Alertas críticas", summary.criticalAlerts],
        ["Calderas operando", summary.boilersOperating],
      ],
    });

    const logs = (data.logs as Array<Record<string, unknown>>) || [];
    sheets.push({
      name: "Bitácoras",
      headers: ["Fecha", "Caldera", "Turno", "Presión", "Temp.", "Nivel", "Operador", "Estado"],
      rows: logs.map((l) => {
        const boiler = l.boiler as { name: string };
        const operator = l.operator as { username: string };
        return [
          formatDate(l.logDate as string, true),
          boiler.name,
          l.shift as string,
          l.steamPressure as number | null,
          l.steamTemperature as number | null,
          l.waterLevel as number | null,
          operator.username,
          LOG_STATUS_LABELS[l.status as string] || (l.status as string),
        ];
      }),
    });

    const alerts = (data.alerts as Array<Record<string, unknown>>) || [];
    sheets.push({
      name: "Alertas",
      headers: ["Fecha", "Caldera", "Parámetro", "Valor", "Severidad", "Estado", "Capturada por"],
      rows: alerts.map((a) => {
        const boiler = a.boiler as { name: string };
        const capturedBy = a.capturedBy as { username: string };
        return [
          formatDate(a.alertDate as string, true),
          boiler.name,
          a.parameter as string,
          a.recordedValue as string | null,
          ALERT_SEVERITY_LABELS[a.severity as string] || (a.severity as string),
          a.status as string,
          capturedBy.username,
        ];
      }),
    });
  }

  if (type === "trends" && data.trends) {
    const trends = data.trends as Record<string, string | number>[];
    const activeMetrics = TREND_METRICS.filter((m) =>
      trends.some((t) => typeof t[m.key] === "number")
    );
    sheets.push({
      name: "Tendencias",
      headers: ["Periodo", ...activeMetrics.map((m) => m.label), "Registros"],
      rows: trends.map((t) => [
        t.label as string,
        ...activeMetrics.map((m) => (typeof t[m.key] === "number" ? t[m.key] : "")),
        t.count as number,
      ]),
    });

    const incidents = (data.incidents as Array<Record<string, number | string>>) || [];
    if (incidents.length > 0) {
      sheets.push({
        name: "Incidencias",
        headers: ["Periodo", "Total", "Crítico", "Advertencia", "Informativo"],
        rows: incidents.map((i) => [
          i.label as string,
          i.total as number,
          i.critico as number,
          i.advertencia as number,
          i.informativo as number,
        ]),
      });
    }
  }

  if (data.alerts && type !== "daily") {
    const alerts = data.alerts as Array<Record<string, unknown>>;
    sheets.push({
      name: "Alertas",
      headers: ["Fecha", "Caldera", "Parámetro", "Valor", "Límite", "Severidad", "Estado", "Capturada por"],
      rows: alerts.map((a) => {
        const boiler = a.boiler as { name: string };
        const capturedBy = a.capturedBy as { username: string };
        return [
          formatDate(a.alertDate as string, true),
          boiler.name,
          a.parameter as string,
          a.recordedValue as string | null,
          (a.configuredLimit as string | null) ?? "",
          ALERT_SEVERITY_LABELS[a.severity as string] || (a.severity as string),
          a.status as string,
          capturedBy.username,
        ];
      }),
    });
  }

  if (data.logs && type !== "daily") {
    const logs = data.logs as Array<Record<string, unknown>>;
    sheets.push({
      name: "Bitácoras",
      headers: ["Fecha", "Caldera", "Turno", "Presión", "Nivel", "Operador", "Estado"],
      rows: logs.map((l) => {
        const boiler = l.boiler as { name: string };
        const operator = l.operator as { username: string };
        return [
          formatDate(l.logDate as string, true),
          boiler.name,
          l.shift as string,
          l.steamPressure as number | null,
          l.waterLevel as number | null,
          operator.username,
          LOG_STATUS_LABELS[l.status as string] || (l.status as string),
        ];
      }),
    });
  }

  return sheets;
}

export function generateReportExport(
  data: Record<string, unknown>,
  format: ReportExportFormat
): { buffer: Buffer | string; contentType: string; filename: string } {
  const sheets = buildSheets(data);
  const type = (data.type as string) || "reporte";
  const period = data.period as TrendPeriod | undefined;

  const meta: string[] = [];
  if (data.startDate) meta.push(`Desde: ${data.startDate}`);
  if (data.endDate) meta.push(`Hasta: ${data.endDate}`);
  if (period) meta.push(`Periodo: ${PERIOD_LABELS[period] || period}`);

  return packageExport(sheets, format, `reporte-${type}`, {
    title: "Bitácora de Calderas — Reporte",
    subtitle: reportTitle(type),
    meta,
  });
}
