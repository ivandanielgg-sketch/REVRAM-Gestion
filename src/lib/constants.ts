export const COMPLIANCE_DISCLAIMER =
  "Sistema de apoyo documental para operación, mantenimiento, trazabilidad y consulta histórica. La validación normativa final debe ser realizada por personal calificado.";

export const SAFETY_CHECKLIST_ITEMS = [
  { key: "visual_level_verified", label: "Nivel visual verificado" },
  { key: "gauge_glass_blown", label: "Columna de agua purgada" },
  { key: "low_water_tested", label: "Bajo nivel probado" },
  { key: "safety_valve_no_leak", label: "Válvula de seguridad sin fuga visible" },
  { key: "operating_pressure_switch", label: "Presostato operativo" },
  { key: "flame_control_no_alarm", label: "Control de flama sin alarma" },
  { key: "flame_detector_clean", label: "Detector de flama limpio/estable" },
  { key: "fan_no_vibration", label: "Ventilador sin vibración anormal" },
  { key: "gas_train_no_leak", label: "Tren de gas sin fuga visible" },
  { key: "main_valves_no_leak", label: "Válvulas principales sin fuga visible" },
  { key: "burner_stable", label: "Quemador estable" },
  { key: "no_gas_odor", label: "No hay olor a gas" },
  { key: "no_abnormal_noise", label: "No hay ruido anormal" },
  { key: "no_water_steam_leak", label: "No hay fuga de agua/vapor" },
  { key: "area_clear", label: "Área libre de obstrucciones" },
  { key: "extinguisher_accessible", label: "Extintor/accesos disponibles" },
] as const;

export const BRAND_TITLE = "Sistema de bitácoras inteligentes REVRAM";
export const BRAND_SUBTITLE = "Sistema de bitácoras inteligentes";

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Administrador global",
  COMPANY_ADMIN: "Administrador de empresa",
  SUPERVISOR: "Supervisor",
  OPERATOR: "Operador",
  MAINTENANCE: "Mantenimiento",
  VIEWER: "Consulta",
};

export const USER_STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: "Pendiente",
  ACTIVE: "Activo",
  REJECTED: "Rechazado",
  DISABLED: "Deshabilitado",
  DELETED: "Eliminado",
};

export const COMPANY_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activa",
  DISABLED: "Deshabilitada",
  DELETED: "Eliminada",
};

export const BOILER_TYPE_LABELS: Record<string, string> = {
  TUBOS_HUMO: "Tubos de humo",
  ACUOTUBULAR: "Acuotubular",
  AGUA_CALIENTE: "Agua caliente",
  ACEITE_TERMICO: "Aceite térmico",
  MIXTA: "Mixta, Tubos de humo y Acuotubular",
  OTRO: "Otro",
};

export const FUEL_TYPE_LABELS: Record<string, string> = {
  GAS_NATURAL: "Gas natural",
  GAS_LP: "Gas LP",
  DIESEL: "Diésel",
  COMBUSTOLEO: "Combustóleo",
  DUAL: "Dual",
  BIOMASA: "Biomasa",
  OTRO: "Otro",
};

export const OPERATING_FUEL_LABELS: Record<string, string> = {
  GAS_NATURAL: "Gas natural",
  GAS_LP: "Gas LP",
  DIESEL: "Diésel",
  COMBUSTOLEO: "Combustóleo",
  BIOMASA: "Biomasa",
  OTRO: "Otro",
};

export const PLANT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activa",
  DISABLED: "Deshabilitada",
};

export function displayBoilerType(type: string, customType?: string | null): string {
  if (type === "OTRO" && customType) return customType;
  return BOILER_TYPE_LABELS[type] || type;
}

export function displayFuelType(fuelType: string, customFuelType?: string | null): string {
  if (fuelType === "OTRO" && customFuelType) return customFuelType;
  return FUEL_TYPE_LABELS[fuelType] || fuelType;
}

export const LOG_STATUS_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  ENVIADO: "Enviado",
  REVISADO: "Revisado",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
  BLOQUEADO: "Bloqueado",
};

export const ALERT_SEVERITY_LABELS: Record<string, string> = {
  NORMAL: "Normal",
  ADVERTENCIA: "Advertencia",
  CRITICO: "Crítico",
};

export const SEVERITY_COLORS: Record<string, string> = {
  NORMAL: "bg-green-100 text-green-800 border-green-200",
  ADVERTENCIA: "bg-amber-100 text-amber-800 border-amber-200",
  CRITICO: "bg-red-100 text-red-800 border-red-200",
};

export const STATUS_COLORS: Record<string, string> = {
  OPERANDO: "bg-green-100 text-green-800",
  FUERA_SERVICIO: "bg-red-100 text-red-800",
  MANTENIMIENTO: "bg-amber-100 text-amber-800",
  STANDBY: "bg-slate-100 text-slate-800",
};
