import { AlertSeverity, MaintenancePriority } from "@/generated/prisma/client";
import { SAFETY_CHECKLIST_ITEMS } from "@/lib/constants";

export interface AlertInput {
  parameter: string;
  recordedValue: string;
  configuredLimit: string;
  severity: AlertSeverity;
}

export interface LogAlertContext {
  steamPressure?: number | null;
  steamTemperature?: number | null;
  waterLevel?: number | null;
  ph?: number | null;
  conductivity?: number | null;
  o2?: number | null;
  co?: number | null;
  flueGasTemperature?: number | null;
  requiresMaintenance?: boolean;
  maintenancePriority?: MaintenancePriority | null;
  safetyChecklist?: { itemKey: string; response: string }[];
}

export interface OperatingLimits {
  pressureMin?: number | null;
  pressureMax?: number | null;
  temperatureMin?: number | null;
  temperatureMax?: number | null;
  waterLevelMin?: number | null;
  conductivityMax?: number | null;
  phMin?: number | null;
  phMax?: number | null;
  o2Min?: number | null;
  o2Max?: number | null;
  coMax?: number | null;
  flueGasTempMax?: number | null;
}

function outOfRange(value: number, min?: number | null, max?: number | null): boolean {
  if (min != null && value < min) return true;
  if (max != null && value > max) return true;
  return false;
}

export function evaluateAlerts(
  limits: OperatingLimits | null,
  ctx: LogAlertContext
): AlertInput[] {
  const alerts: AlertInput[] = [];
  if (!limits) return alerts;

  if (ctx.steamPressure != null && outOfRange(ctx.steamPressure, limits.pressureMin, limits.pressureMax)) {
    alerts.push({
      parameter: "Presión de vapor",
      recordedValue: String(ctx.steamPressure),
      configuredLimit: `${limits.pressureMin ?? "—"} - ${limits.pressureMax ?? "—"}`,
      severity: "CRITICO",
    });
  }

  if (ctx.steamTemperature != null && outOfRange(ctx.steamTemperature, limits.temperatureMin, limits.temperatureMax)) {
    alerts.push({
      parameter: "Temperatura de vapor",
      recordedValue: String(ctx.steamTemperature),
      configuredLimit: `${limits.temperatureMin ?? "—"} - ${limits.temperatureMax ?? "—"}`,
      severity: "CRITICO",
    });
  }

  if (ctx.conductivity != null && limits.conductivityMax != null && ctx.conductivity > limits.conductivityMax) {
    alerts.push({
      parameter: "Conductividad",
      recordedValue: String(ctx.conductivity),
      configuredLimit: `Máx: ${limits.conductivityMax}`,
      severity: "ADVERTENCIA",
    });
  }

  if (ctx.ph != null && outOfRange(ctx.ph, limits.phMin, limits.phMax)) {
    alerts.push({
      parameter: "pH",
      recordedValue: String(ctx.ph),
      configuredLimit: `${limits.phMin ?? "—"} - ${limits.phMax ?? "—"}`,
      severity: "ADVERTENCIA",
    });
  }

  if (ctx.o2 != null && outOfRange(ctx.o2, limits.o2Min, limits.o2Max)) {
    alerts.push({
      parameter: "O2",
      recordedValue: String(ctx.o2),
      configuredLimit: `${limits.o2Min ?? "—"} - ${limits.o2Max ?? "—"}`,
      severity: "ADVERTENCIA",
    });
  }

  if (ctx.co != null && limits.coMax != null && ctx.co > limits.coMax) {
    alerts.push({
      parameter: "CO",
      recordedValue: String(ctx.co),
      configuredLimit: `Máx: ${limits.coMax}`,
      severity: "CRITICO",
    });
  }

  if (ctx.flueGasTemperature != null && limits.flueGasTempMax != null && ctx.flueGasTemperature > limits.flueGasTempMax) {
    alerts.push({
      parameter: "Temperatura de gases",
      recordedValue: String(ctx.flueGasTemperature),
      configuredLimit: `Máx: ${limits.flueGasTempMax}`,
      severity: "ADVERTENCIA",
    });
  }

  if (ctx.waterLevel != null && limits.waterLevelMin != null && ctx.waterLevel < limits.waterLevelMin) {
    alerts.push({
      parameter: "Nivel de agua",
      recordedValue: String(ctx.waterLevel),
      configuredLimit: `Mín: ${limits.waterLevelMin}`,
      severity: "CRITICO",
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
  steamPressure: number | null;
  waterLevel: number | null;
  safetyChecklist: { response: string }[];
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!log.boilerId) errors.push("Caldera requerida");
  if (!log.operatorId) errors.push("Operador requerido");
  if (!log.shift) errors.push("Turno requerido");
  if (log.steamPressure == null) errors.push("Presión de vapor requerida");
  if (log.waterLevel == null) errors.push("Nivel de agua requerido");
  if (log.safetyChecklist.length === 0) errors.push("Checklist de seguridad incompleto");
  return { valid: errors.length === 0, errors };
}
