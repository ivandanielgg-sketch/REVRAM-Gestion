export interface OperatingLimitsRecord {
  pressureMin?: number | null;
  pressureMax?: number | null;
  temperatureMin?: number | null;
  temperatureMax?: number | null;
  waterLevelMin?: number | null;
  waterLevelMax?: number | null;
  conductivityMax?: number | null;
  tdsMax?: number | null;
  phMin?: number | null;
  phMax?: number | null;
  o2Min?: number | null;
  o2Max?: number | null;
  coMax?: number | null;
  flueGasTempMax?: number | null;
  gasPressureMin?: number | null;
  gasPressureMax?: number | null;
  airPressureMin?: number | null;
  airPressureMax?: number | null;
}

export interface MetricLimitBand {
  min?: number | null;
  max?: number | null;
}

type LimitKey = keyof OperatingLimitsRecord;

const METRIC_LIMIT_MAP: Record<string, { min?: LimitKey; max?: LimitKey }> = {
  steamPressure: { min: "pressureMin", max: "pressureMax" },
  steamTemperature: { min: "temperatureMin", max: "temperatureMax" },
  waterLevel: { min: "waterLevelMin", max: "waterLevelMax" },
  ph: { min: "phMin", max: "phMax" },
  conductivity: { max: "conductivityMax" },
  tds: { max: "tdsMax" },
  flueGasTemperature: { max: "flueGasTempMax" },
  o2: { min: "o2Min", max: "o2Max" },
  co: { max: "coMax" },
  fuelPressure: { min: "gasPressureMin", max: "gasPressureMax" },
  airPressure: { min: "airPressureMin", max: "airPressureMax" },
};

function bandForMetric(records: OperatingLimitsRecord[], metricKey: string): MetricLimitBand {
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
  records: OperatingLimitsRecord[]
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
