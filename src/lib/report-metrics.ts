export type TrendPeriod = "day" | "week" | "month" | "year" | "custom";

export interface TrendMetric {
  key: string;
  label: string;
  unit?: string;
  color: string;
  group: "vapor" | "agua" | "combustion" | "tratamiento" | "operacion";
}

export const TREND_METRICS: TrendMetric[] = [
  { key: "steamPressureKgCm2", label: "Presión de vapor", unit: "kg/cm²", color: "#334155", group: "vapor" },
  { key: "steamTemperatureC", label: "Temperatura de vapor", unit: "°C", color: "#475569", group: "vapor" },
  { key: "waterLevelPercent", label: "Nivel de agua", unit: "%", color: "#0284c7", group: "agua" },
  { key: "feedwaterPressureKgCm2", label: "Presión agua alimentación", unit: "kg/cm²", color: "#0369a1", group: "agua" },
  { key: "feedwaterTemperatureC", label: "Temp. agua alimentación", unit: "°C", color: "#0ea5e9", group: "agua" },
  { key: "condensateReturnTemperatureC", label: "Temp. retorno condensado", unit: "°C", color: "#38bdf8", group: "agua" },
  { key: "flueGasTemperatureC", label: "Temp. gases de chimenea", unit: "°C", color: "#dc2626", group: "combustion" },
  { key: "o2Percent", label: "O₂", unit: "%", color: "#2563eb", group: "combustion" },
  { key: "coPpm", label: "CO", unit: "ppm", color: "#ca8a04", group: "combustion" },
  { key: "co2Percent", label: "CO₂", unit: "%", color: "#ea580c", group: "combustion" },
  { key: "excessAirPercent", label: "Aire en exceso", unit: "%", color: "#f97316", group: "combustion" },
  { key: "estimatedEfficiencyPercent", label: "Eficiencia estimada", unit: "%", color: "#b45309", group: "combustion" },
  { key: "ph", label: "pH", color: "#059669", group: "tratamiento" },
  { key: "conductivityUsCm", label: "Conductividad", unit: "μS/cm", color: "#7c3aed", group: "tratamiento" },
  { key: "tdsPpm", label: "TDS", unit: "ppm", color: "#9333ea", group: "tratamiento" },
  { key: "hardnessPpmAsCaCO3", label: "Dureza", unit: "ppm CaCO₃", color: "#a855f7", group: "tratamiento" },
  { key: "loadPercentage", label: "Carga", unit: "%", color: "#64748b", group: "operacion" },
  { key: "fuelPressureValue", label: "Presión combustible", unit: "var.", color: "#78716c", group: "operacion" },
  { key: "airPressure", label: "Presión de aire", unit: "kg/cm²", color: "#57534e", group: "operacion" },
  { key: "fanFrequencyHz", label: "Frecuencia ventilador", unit: "Hz", color: "#44403c", group: "operacion" },
];

export const TREND_GROUP_LABELS: Record<TrendMetric["group"], string> = {
  vapor: "Vapor",
  agua: "Agua y alimentación",
  combustion: "Combustión",
  tratamiento: "Tratamiento de agua",
  operacion: "Operación",
};

export const STANDARD_BOILER_METRICS: TrendMetric[] = TREND_METRICS.filter((m) =>
  ["steamPressureKgCm2", "steamTemperatureC", "waterLevelPercent", "flueGasTemperatureC", "ph", "conductivityUsCm"].includes(m.key)
);

export const PERIOD_LABELS: Record<TrendPeriod, string> = {
  day: "Día (hoy)",
  week: "Semana (7 días)",
  month: "Mes (30 días)",
  year: "Año (12 meses)",
  custom: "Rango personalizado",
};

export function parseDateParam(value: string | null | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return undefined;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
}

export function getBucketForRange(start: Date, end: Date): "hour" | "day" | "month" {
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 2) return "hour";
  if (diffDays <= 90) return "day";
  return "month";
}

export function resolveDateRange(
  period: TrendPeriod,
  startDate?: string | null,
  endDate?: string | null
): { start: Date; end: Date; bucket: "hour" | "day" | "month" } {
  if (period === "custom" || startDate || endDate) {
    const end = parseDateParam(endDate, true) ?? new Date();
    const start =
      parseDateParam(startDate) ??
      (() => {
        const s = new Date(end);
        s.setDate(s.getDate() - 29);
        s.setHours(0, 0, 0, 0);
        return s;
      })();
    start.setHours(0, 0, 0, 0);
    return { start, end, bucket: getBucketForRange(start, end) };
  }
  return getPeriodRange(period);
}

interface LogRow {
  logDate: Date | string;
  steamPressureKgCm2?: number | null;
  steamTemperatureC?: number | null;
  feedwaterPressureKgCm2?: number | null;
  feedwaterTemperatureC?: number | null;
  condensateReturnTemperatureC?: number | null;
  waterLevelPercent?: number | null;
  loadPercentage?: number | null;
  fuelPressureValue?: number | null;
  airPressure?: number | null;
  fanFrequencyHz?: number | null;
  combustion?: {
    flueGasTemperatureC?: number | null;
    o2Percent?: number | null;
    coPpm?: number | null;
    co2Percent?: number | null;
    excessAirPercent?: number | null;
    estimatedEfficiencyPercent?: number | null;
    steamFlowKgH?: number | null;
  } | null;
  waterTreatment?: {
    ph?: number | null;
    conductivityUsCm?: number | null;
    tdsPpm?: number | null;
    hardnessPpmAsCaCO3?: number | null;
  } | null;
}

export function getPeriodRange(
  period: Exclude<TrendPeriod, "custom">
): { start: Date; end: Date; bucket: "hour" | "day" | "month" } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case "day":
      start.setHours(0, 0, 0, 0);
      return { start, end, bucket: "hour" };
    case "week":
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { start, end, bucket: "day" };
    case "month":
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      return { start, end, bucket: "day" };
    case "year":
      start.setMonth(start.getMonth() - 11, 1);
      start.setHours(0, 0, 0, 0);
      return { start, end, bucket: "month" };
  }
}

function bucketKey(date: Date, bucket: "hour" | "day" | "month"): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  if (bucket === "hour") return `${y}-${m}-${d}T${h}`;
  if (bucket === "day") return `${y}-${m}-${d}`;
  return `${y}-${m}`;
}

function bucketLabel(key: string, bucket: "hour" | "day" | "month"): string {
  if (bucket === "hour") {
    const [, time] = key.split("T");
    return `${time}:00`;
  }
  if (bucket === "day") {
    const [, month, day] = key.split("-");
    return `${day}/${month}`;
  }
  const [year, month] = key.split("-");
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${monthNames[Number(month) - 1]} ${year.slice(2)}`;
}

function getMetricValue(log: LogRow, key: string): number | null {
  const direct = log[key as keyof LogRow];
  if (typeof direct === "number") return direct;
  if (log.combustion && key in log.combustion) {
    const v = log.combustion[key as keyof typeof log.combustion];
    return typeof v === "number" ? v : null;
  }
  if (log.waterTreatment && key in log.waterTreatment) {
    const v = log.waterTreatment[key as keyof typeof log.waterTreatment];
    return typeof v === "number" ? v : null;
  }
  return null;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

export function aggregateTrendData(
  logs: LogRow[],
  period: Exclude<TrendPeriod, "custom">,
  customStart?: Date,
  customEnd?: Date
): { label: string; count: number; [key: string]: string | number }[] {
  const bucket =
    customStart && customEnd
      ? getBucketForRange(customStart, customEnd)
      : getPeriodRange(period).bucket;
  return aggregateTrendDataWithBucket(logs, bucket);
}

export function aggregateTrendDataWithBucket(
  logs: LogRow[],
  bucket: "hour" | "day" | "month"
): { label: string; count: number; [key: string]: string | number }[] {
  const buckets = new Map<string, Map<string, number[]>>();

  for (const log of logs) {
    const date = typeof log.logDate === "string" ? new Date(log.logDate) : log.logDate;
    const key = bucketKey(date, bucket);
    if (!buckets.has(key)) buckets.set(key, new Map());
    const metricMap = buckets.get(key)!;

    for (const metric of TREND_METRICS) {
      const value = getMetricValue(log, metric.key);
      if (value == null) continue;
      if (!metricMap.has(metric.key)) metricMap.set(metric.key, []);
      metricMap.get(metric.key)!.push(value);
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, metricMap]) => {
      const point: { label: string; count: number; [key: string]: string | number } = {
        label: bucketLabel(key, bucket),
        count: 0,
      };
      let maxCount = 0;
      for (const metric of TREND_METRICS) {
        const values = metricMap.get(metric.key);
        if (values && values.length > 0) {
          point[metric.key] = average(values);
          maxCount = Math.max(maxCount, values.length);
        }
      }
      point.count = maxCount;
      return point;
    });
}

export interface IncidentPoint {
  label: string;
  total: number;
  critico: number;
  advertencia: number;
  informativo: number;
}

interface AlertRow {
  alertDate: Date | string;
  severity: string;
}

export function aggregateIncidentsWithBucket(
  alerts: AlertRow[],
  bucket: "hour" | "day" | "month"
): IncidentPoint[] {
  const buckets = new Map<string, { critico: number; advertencia: number; informativo: number }>();

  for (const alert of alerts) {
    const date = typeof alert.alertDate === "string" ? new Date(alert.alertDate) : alert.alertDate;
    const key = bucketKey(date, bucket);
    if (!buckets.has(key)) {
      buckets.set(key, { critico: 0, advertencia: 0, informativo: 0 });
    }
    const entry = buckets.get(key)!;
    if (alert.severity === "CRITICO") entry.critico += 1;
    else if (alert.severity === "ADVERTENCIA") entry.advertencia += 1;
    else entry.informativo += 1;
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, counts]) => ({
      label: bucketLabel(key, bucket),
      total: counts.critico + counts.advertencia + counts.informativo,
      ...counts,
    }));
}
