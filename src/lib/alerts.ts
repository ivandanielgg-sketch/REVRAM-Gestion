import { AlertSeverity, MaintenancePriority } from "@/generated/prisma/client";
import { SAFETY_CHECKLIST_ITEMS } from "@/lib/constants";

export interface AlertInput {
  parameter: string;
  recordedValue: string;
  configuredLimit: string;
  severity: AlertSeverity;
}

export interface LogAlertContext {
  steamPressureKgCm2?: number | null;
  steamTemperatureC?: number | null;
  waterLevelPercent?: number | null;
  ph?: number | null;
  conductivityUsCm?: number | null;
  tdsPpm?: number | null;
  o2Percent?: number | null;
  coPpm?: number | null;
  flueGasTemperatureC?: number | null;
  fuelPressureValue?: number | null;
  fuelPressureUnit?: string | null;
  requiresMaintenance?: boolean;
  maintenancePriority?: MaintenancePriority | null;
  safetyChecklist?: { itemKey: string; response: string }[];
}

export interface OperatingLimits {
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
}

function outOfRange(value: number, min?: number | null, max?: number | null): boolean {
  if (min != null && value < min) return true;
  if (max != null && value > max) return true;
  return false;
}

function hasLimit(min?: number | null, max?: number | null): boolean {
  return min != null || max != null;
}

export function evaluateAlerts(
  limits: OperatingLimits | null,
  ctx: LogAlertContext
): AlertInput[] {
  const alerts: AlertInput[] = [];
  if (!limits) return alerts;

  if (
    ctx.steamPressureKgCm2 != null &&
    hasLimit(limits.pressureMinKgCm2, limits.pressureMaxKgCm2) &&
    outOfRange(ctx.steamPressureKgCm2, limits.pressureMinKgCm2, limits.pressureMaxKgCm2)
  ) {
    alerts.push({
      parameter: "Presión de vapor (kg/cm²)",
      recordedValue: `${ctx.steamPressureKgCm2} kg/cm²`,
      configuredLimit: `${limits.pressureMinKgCm2 ?? "—"} - ${limits.pressureMaxKgCm2 ?? "—"} kg/cm²`,
      severity: "CRITICO",
    });
  }

  if (
    ctx.steamTemperatureC != null &&
    hasLimit(limits.temperatureMinC, limits.temperatureMaxC) &&
    outOfRange(ctx.steamTemperatureC, limits.temperatureMinC, limits.temperatureMaxC)
  ) {
    alerts.push({
      parameter: "Temperatura de vapor (°C)",
      recordedValue: `${ctx.steamTemperatureC} °C`,
      configuredLimit: `${limits.temperatureMinC ?? "—"} - ${limits.temperatureMaxC ?? "—"} °C`,
      severity: "CRITICO",
    });
  }

  if (
    ctx.conductivityUsCm != null &&
    limits.conductivityMaxUsCm != null &&
    ctx.conductivityUsCm > limits.conductivityMaxUsCm
  ) {
    alerts.push({
      parameter: "Conductividad (μS/cm)",
      recordedValue: `${ctx.conductivityUsCm} μS/cm`,
      configuredLimit: `Máx: ${limits.conductivityMaxUsCm} μS/cm`,
      severity: "ADVERTENCIA",
    });
  }

  if (
    ctx.tdsPpm != null &&
    limits.tdsMaxPpm != null &&
    ctx.tdsPpm > limits.tdsMaxPpm
  ) {
    alerts.push({
      parameter: "TDS (ppm)",
      recordedValue: `${ctx.tdsPpm} ppm`,
      configuredLimit: `Máx: ${limits.tdsMaxPpm} ppm`,
      severity: "ADVERTENCIA",
    });
  }

  if (
    ctx.ph != null &&
    hasLimit(limits.phMin, limits.phMax) &&
    outOfRange(ctx.ph, limits.phMin, limits.phMax)
  ) {
    alerts.push({
      parameter: "pH",
      recordedValue: String(ctx.ph),
      configuredLimit: `${limits.phMin ?? "—"} - ${limits.phMax ?? "—"}`,
      severity: "ADVERTENCIA",
    });
  }

  if (
    ctx.o2Percent != null &&
    hasLimit(limits.o2MinPercent, limits.o2MaxPercent) &&
    outOfRange(ctx.o2Percent, limits.o2MinPercent, limits.o2MaxPercent)
  ) {
    alerts.push({
      parameter: "O₂ (%)",
      recordedValue: `${ctx.o2Percent} %`,
      configuredLimit: `${limits.o2MinPercent ?? "—"} - ${limits.o2MaxPercent ?? "—"} %`,
      severity: "ADVERTENCIA",
    });
  }

  if (ctx.coPpm != null && limits.coMaxPpm != null && ctx.coPpm > limits.coMaxPpm) {
    alerts.push({
      parameter: "CO (ppm)",
      recordedValue: `${ctx.coPpm} ppm`,
      configuredLimit: `Máx: ${limits.coMaxPpm} ppm`,
      severity: "CRITICO",
    });
  }

  if (
    ctx.flueGasTemperatureC != null &&
    limits.stackTemperatureMaxC != null &&
    ctx.flueGasTemperatureC > limits.stackTemperatureMaxC
  ) {
    alerts.push({
      parameter: "Temperatura de gases (°C)",
      recordedValue: `${ctx.flueGasTemperatureC} °C`,
      configuredLimit: `Máx: ${limits.stackTemperatureMaxC} °C`,
      severity: "ADVERTENCIA",
    });
  }

  if (
    ctx.waterLevelPercent != null &&
    limits.waterLevelMinPercent != null &&
    ctx.waterLevelPercent < limits.waterLevelMinPercent
  ) {
    alerts.push({
      parameter: "Nivel de agua (%)",
      recordedValue: `${ctx.waterLevelPercent} %`,
      configuredLimit: `Mín: ${limits.waterLevelMinPercent} %`,
      severity: "CRITICO",
    });
  }

  if (
    ctx.waterLevelPercent != null &&
    limits.waterLevelMaxPercent != null &&
    ctx.waterLevelPercent > limits.waterLevelMaxPercent
  ) {
    alerts.push({
      parameter: "Nivel de agua (%)",
      recordedValue: `${ctx.waterLevelPercent} %`,
      configuredLimit: `Máx: ${limits.waterLevelMaxPercent} %`,
      severity: "ADVERTENCIA",
    });
  }

  const checklistMap = Object.fromEntries(SAFETY_CHECKLIST_ITEMS.map((i) => [i.key, i.label]));

  for (const item of ctx.safetyChecklist ?? []) {
    if (item.response !== "NO_CUMPLE") continue;
    const label = checklistMap[item.itemKey] ?? item.itemKey;
    let severity: AlertSeverity = "ADVERTENCIA";
    if (item.itemKey === "low_water_tested") severity = "CRITICO";
    if (item.itemKey === "no_gas_odor" || item.itemKey === "gas_train_no_leak") severity = "CRITICO";
    if (item.itemKey === "no_water_steam_leak") severity = "CRITICO";
    alerts.push({
      parameter: `Prueba de seguridad: ${label}`,
      recordedValue: "No cumple",
      configuredLimit: "Cumple",
      severity,
    });
  }

  if (ctx.requiresMaintenance && ctx.maintenancePriority === "CRITICA") {
    alerts.push({
      parameter: "Mantenimiento requerido",
      recordedValue: "Crítico",
      configuredLimit: "—",
      severity: "CRITICO",
    });
  }

  return alerts;
}

export function isLogCompleteForApproval(log: {
  boilerId: string;
  operatorId: string;
  shift: string;
  steamPressureKgCm2: number | null;
  waterLevelPercent: number | null;
  safetyChecklist: { response: string }[];
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!log.boilerId) errors.push("Caldera requerida");
  if (!log.operatorId) errors.push("Operador requerido");
  if (!log.shift) errors.push("Turno requerido");
  if (log.steamPressureKgCm2 == null) errors.push("Presión de vapor requerida");
  if (log.waterLevelPercent == null) errors.push("Nivel de agua requerido");
  if (log.safetyChecklist.length === 0) errors.push("Checklist de seguridad incompleto");
  return { valid: errors.length === 0, errors };
}
