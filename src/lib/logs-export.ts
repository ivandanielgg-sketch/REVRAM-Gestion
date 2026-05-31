import { formatDate } from "@/lib/utils";
import { LOG_STATUS_LABELS } from "@/lib/constants";
import { packageExport, type ExportFormat, type ExportSheet } from "@/lib/export-utils";
import type { fetchFilteredLogs } from "@/lib/logs-query";

type LogRecord = Awaited<ReturnType<typeof fetchFilteredLogs>>[number];

const LOG_HEADERS = [
  "Fecha",
  "Caldera",
  "Planta",
  "Operador",
  "Turno",
  "Estado operacional",
  "Estado registro",
  "Presión vapor (kg/cm²)",
  "Temp. vapor (°C)",
  "Nivel agua (%)",
  "Presión alimentación (kg/cm²)",
  "Temp. alimentación (°C)",
  "pH",
  "Conductividad (μS/cm)",
  "TDS (ppm)",
  "Temp. gases (°C)",
  "O₂ (%)",
  "CO (ppm)",
  "Carga (%)",
  "Alertas",
  "Req. mantenimiento",
  "Observaciones",
];

function logToRow(log: LogRecord): (string | number | null)[] {
  return [
    formatDate(log.logDate, true),
    log.boiler.name,
    log.boiler.plant?.client ?? "",
    log.operator.username,
    log.shift,
    log.operationalState,
    LOG_STATUS_LABELS[log.status] || log.status,
    log.steamPressureKgCm2,
    log.steamTemperatureC,
    log.waterLevelPercent,
    log.feedwaterPressureKgCm2,
    log.feedwaterTemperatureC,
    log.waterTreatment?.ph ?? null,
    log.waterTreatment?.conductivityUsCm ?? null,
    log.waterTreatment?.tdsPpm ?? null,
    log.combustion?.flueGasTemperatureC ?? null,
    log.combustion?.o2Percent ?? null,
    log.combustion?.coPpm ?? null,
    log.loadPercentage,
    log.alerts.length,
    log.requiresMaintenance ? "Sí" : "No",
    log.generalObservations ?? log.abnormalCondition ?? "",
  ];
}

function buildLogSheets(logs: LogRecord[]): ExportSheet[] {
  return [
    {
      name: "Bitácoras",
      headers: LOG_HEADERS,
      rows: logs.map(logToRow),
    },
  ];
}

export function generateLogsExport(
  logs: LogRecord[],
  format: ExportFormat,
  filters: { startDate?: string | null; endDate?: string | null }
) {
  const sheets = buildLogSheets(logs);
  const meta: string[] = [`Total registros: ${logs.length}`];
  if (filters.startDate) meta.push(`Desde: ${filters.startDate}`);
  if (filters.endDate) meta.push(`Hasta: ${filters.endDate}`);

  return packageExport(sheets, format, "bitacoras", {
    title: "Bitácora de Calderas — Historial",
    subtitle: "Registros de operación",
    meta,
  });
}
