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
  "Presión vapor (psi)",
  "Temp. vapor (°C)",
  "Nivel agua (%)",
  "Presión alimentación",
  "Temp. alimentación",
  "pH",
  "Conductividad",
  "Temp. gases",
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
    log.steamPressure,
    log.steamTemperature,
    log.waterLevel,
    log.feedwaterPressure,
    log.feedwaterTemperature,
    log.waterTreatment?.ph ?? null,
    log.waterTreatment?.conductivity ?? null,
    log.combustion?.flueGasTemperature ?? null,
    log.combustion?.o2 ?? null,
    log.combustion?.co ?? null,
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
