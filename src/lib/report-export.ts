import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "@/lib/utils";
import { ALERT_SEVERITY_LABELS, LOG_STATUS_LABELS } from "@/lib/constants";
import { TREND_METRICS, PERIOD_LABELS, type TrendPeriod } from "@/lib/report-metrics";

type ExportFormat = "csv" | "xlsx" | "pdf";

interface ExportSheet {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
}

function escapeCsvCell(value: string | number | null): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

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

function buildCsv(sheets: ExportSheet[]): string {
  return sheets
    .map((sheet) => {
      const section = [`=== ${sheet.name} ===`, sheet.headers.join(","), ...sheet.rows.map((r) => r.map(escapeCsvCell).join(","))];
      return section.join("\n");
    })
    .join("\n\n");
}

function buildXlsx(sheets: ExportSheet[]): Buffer {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

function buildPdf(data: Record<string, unknown>, sheets: ExportSheet[]): Buffer {
  const doc = new jsPDF({ orientation: "landscape" });
  const type = data.type as string;
  const period = data.period as TrendPeriod | undefined;

  doc.setFontSize(14);
  doc.text("Bitácora de Calderas — Reporte", 14, 16);
  doc.setFontSize(10);
  doc.text(reportTitle(type), 14, 24);

  const meta: string[] = [];
  if (data.startDate) meta.push(`Desde: ${data.startDate}`);
  if (data.endDate) meta.push(`Hasta: ${data.endDate}`);
  if (period) meta.push(`Periodo: ${PERIOD_LABELS[period] || period}`);
  if (meta.length) doc.text(meta.join("  |  "), 14, 30);

  let startY = 36;

  for (const sheet of sheets) {
    if (startY > 180) {
      doc.addPage();
      startY = 16;
    }
    doc.setFontSize(11);
    doc.text(sheet.name, 14, startY);
    autoTable(doc, {
      startY: startY + 4,
      head: [sheet.headers],
      body: sheet.rows.map((r) => r.map((c) => (c == null ? "" : String(c)))),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [51, 65, 85] },
      margin: { left: 14, right: 14 },
    });
    startY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  doc.setFontSize(7);
  doc.text(
    "Sistema de apoyo documental. La validación normativa final debe ser realizada por personal calificado.",
    14,
    doc.internal.pageSize.height - 8
  );

  return Buffer.from(doc.output("arraybuffer"));
}

export function generateReportExport(
  data: Record<string, unknown>,
  format: ExportFormat
): { buffer: Buffer | string; contentType: string; filename: string } {
  const sheets = buildSheets(data);
  if (sheets.length === 0 || sheets.every((s) => s.rows.length === 0)) {
    throw new Error("No hay datos para exportar en el periodo seleccionado");
  }

  const type = (data.type as string) || "reporte";
  const dateStamp = new Date().toISOString().slice(0, 10);
  const baseName = `reporte-${type}-${dateStamp}`;

  if (format === "csv") {
    return {
      buffer: `\uFEFF${buildCsv(sheets)}`,
      contentType: "text/csv; charset=utf-8",
      filename: `${baseName}.csv`,
    };
  }

  if (format === "xlsx") {
    return {
      buffer: buildXlsx(sheets),
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: `${baseName}.xlsx`,
    };
  }

  return {
    buffer: buildPdf(data, sheets),
    contentType: "application/pdf",
    filename: `${baseName}.pdf`,
  };
}
