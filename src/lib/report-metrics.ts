export type TrendPeriod = "day" | "week" | "month" | "year";

export interface TrendMetric {
  key: string;
  label: string;
  unit?: string;
  color: string;
  group: "vapor" | "agua" | "combustion" | "tratamiento" | "operacion";
}

export const TREND_METRICS: TrendMetric[] = [
  { key: "steamPressure", label: "Presión de vapor", unit: "psi", color: "#334155", group: "vapor" },
  { key: "steamTemperature", label: "Temperatura de vapor", unit: "°C", color: "#475569", group: "vapor" },
  { key: "waterLevel", label: "Nivel de agua", unit: "%", color: "#0284c7", group: "agua" },
  { key: "feedwaterPressure", label: "Presión agua alimentación", unit: "psi", color: "#0369a1", group: "agua" },
  { key: "feedwaterTemperature", label: "Temp. agua alimentación", unit: "°C", color: "#0ea5e9", group: "agua" },
  { key: "condensateReturnTemp", label: "Temp. retorno condensado", unit: "°C", color: "#38bdf8", group: "agua" },
  { key: "flueGasTemperature", label: "Temp. gases de chimenea", unit: "°C", color: "#dc2626", group: "combustion" },
  { key: "o2", label: "O₂", unit: "%", color: "#2563eb", group: "combustion" },
  { key: "co", label: "CO", unit: "ppm", color: "#ca8a04", group: "combustion" },
  { key: "co2", label: "CO₂", unit: "%", color: "#ea580c", group: "combustion" },
  { key: "excessAir", label: "Aire en exceso", unit: "%", color: "#f97316", group: "combustion" },
  { key: "estimatedEfficiency", label: "Eficiencia estimada", unit: "%", color: "#b45309", group: "combustion" },
  { key: "ph", label: "pH", color: "#059669", group: "tratamiento" },
  { key: "conductivity", label: "Conductividad", unit: "µS/cm", color: "#7c3aed", group: "tratamiento" },
  { key: "tds", label: "TDS", unit: "ppm", color: "#9333ea", group: "tratamiento" },
  { key: "hardness", label: "Dureza", unit: "ppm", color: "#a855f7", group: "tratamiento" },
  { key: "loadPercentage", label: "Carga", unit: "%", color: "#64748b", group: "operacion" },
  { key: "fuelPressure", label: "Presión combustible", unit: "psi", color: "#78716c", group: "operacion" },
  { key: "airPressure", label: "Presión de aire", unit: "psi", color: "#57534e", group: "operacion" },
  { key: "fanFrequency", label: "Frecuencia ventilador", unit: "Hz", color: "#44403c", group: "operacion" },
];

export const TREND_GROUP_LABELS: Record<TrendMetric["group"], string> = {
  vapor: "Vapor",
  agua: "Agua y alimentación",
  combustion: "Combustión",
  tratamiento: "Tratamiento de agua",
  operacion: "Operación",
};

export const PERIOD_LABELS: Record<TrendPeriod, string> = {
  day: "Día (hoy)",
  week: "Semana (7 días)",
  month: "Mes (30 días)",
  year: "Año (12 meses)",
};

interface LogRow {
  logDate: Date | string;
  steamPressure?: number | null;
  steamTemperature?: number | null;
  feedwaterPressure?: number | null;
  feedwaterTemperature?: number | null;
  condensateReturnTemp?: number | null;
  waterLevel?: number | null;
  loadPercentage?: number | null;
  fuelPressure?: number | null;
  airPressure?: number | null;
  fanFrequency?: number | null;
  combustion?: {
    flueGasTemperature?: number | null;
    o2?: number | null;
    co?: number | null;
    co2?: number | null;
    excessAir?: number | null;
    estimatedEfficiency?: number | null;
  } | null;
  waterTreatment?: {
    ph?: number | null;
    conductivity?: number | null;
    tds?: number | null;
    hardness?: number | null;
  } | null;
}

export function getPeriodRange(period: TrendPeriod): { start: Date; end: Date; bucket: "hour" | "day" | "month" } {
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
  period: TrendPeriod
): { label: string; count: number; [key: string]: string | number }[] {
  const { bucket } = getPeriodRange(period);
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
