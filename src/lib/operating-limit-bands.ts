export interface OperatingLimitsShape {
  pressureMinKgCm2?: number | null;
  pressureMaxKgCm2?: number | null;
  temperatureMinC?: number | null;
  temperatureMaxC?: number | null;
  waterLevelMinPercent?: number | null;
  waterLevelMaxPercent?: number | null;
  conductivityMaxUsCm?: number | null;
  tdsMaxPpm?: number | null;
  phMin?: number | null;
  phMax?: number | null;
  o2MinPercent?: number | null;
  o2MaxPercent?: number | null;
  coMaxPpm?: number | null;
  stackTemperatureMaxC?: number | null;
  gasPressureMin?: number | null;
  gasPressureMax?: number | null;
  airPressureMin?: number | null;
  airPressureMax?: number | null;
}

export interface LimitBand {
  min?: number;
  max?: number;
}

export interface MetricLimitBand {
  min?: number | null;
  max?: number | null;
}

type LimitKey = keyof OperatingLimitsShape;

const METRIC_LIMIT_MAP: Record<string, { min?: LimitKey; max?: LimitKey }> = {
  steamPressureKgCm2: { min: "pressureMinKgCm2", max: "pressureMaxKgCm2" },
  steamTemperatureC: { min: "temperatureMinC", max: "temperatureMaxC" },
  waterLevelPercent: { min: "waterLevelMinPercent", max: "waterLevelMaxPercent" },
  ph: { min: "phMin", max: "phMax" },
  conductivityUsCm: { max: "conductivityMaxUsCm" },
  tdsPpm: { max: "tdsMaxPpm" },
  flueGasTemperatureC: { max: "stackTemperatureMaxC" },
  o2Percent: { min: "o2MinPercent", max: "o2MaxPercent" },
  coPpm: { max: "coMaxPpm" },
  fuelPressureValue: { min: "gasPressureMin", max: "gasPressureMax" },
  airPressure: { min: "airPressureMin", max: "airPressureMax" },
};

function bandForMetric(records: OperatingLimitsShape[], metricKey: string): MetricLimitBand {
  const mapping = METRIC_LIMIT_MAP[metricKey];
  if (!mapping) return {};

  const mins = records
    .map((r) => (mapping.min ? r[mapping.min] : null))
    .filter((v): v is number => v != null);
  const maxs = records
    .map((r) => (mapping.max ? r[mapping.max] : null))
    .filter((v): v is number => v != null);

  return {
    min: mins.length ? Math.min(...mins) : null,
    max: maxs.length ? Math.max(...maxs) : null,
  };
}

export function buildChartLimits(
  records: OperatingLimitsShape[]
): Record<string, MetricLimitBand> {
  const result: Record<string, MetricLimitBand> = {};
  for (const metricKey of Object.keys(METRIC_LIMIT_MAP)) {
    const band = bandForMetric(records, metricKey);
    if (band.min != null || band.max != null) {
      result[metricKey] = band;
    }
  }
  return result;
}

export function limitsDescription(boilerCount: number, singleName?: string): string | null {
  if (boilerCount === 0) return null;
  if (boilerCount === 1 && singleName) {
    return `Bandas de referencia según límites operativos de ${singleName}.`;
  }
  return `Bandas de referencia (rango combinado de ${boilerCount} calderas con límites configurados).`;
}

export function getLimitBand(
  metricKey: string,
  limits: OperatingLimitsShape | null | undefined
): LimitBand | null {
  if (!limits) return null;
  const mapping = METRIC_LIMIT_MAP[metricKey];
  if (!mapping) return null;

  const band: LimitBand = {};
  if (mapping.min) {
    const v = limits[mapping.min];
    if (v != null) band.min = v;
  }
  if (mapping.max) {
    const v = limits[mapping.max];
    if (v != null) band.max = v;
  }
  if (band.min == null && band.max == null) return null;
  return band;
}

export function getAllLimitBands(limits: OperatingLimitsShape | null | undefined) {
  const result: Record<string, LimitBand> = {};
  for (const key of Object.keys(METRIC_LIMIT_MAP)) {
    const band = getLimitBand(key, limits);
    if (band) result[key] = band;
  }
  return result;
}
