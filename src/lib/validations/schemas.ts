import { z } from "zod";
import { OPERATING_FUEL_OPTIONS } from "@/lib/units";
import { getDefaultFuelConsumptionUnit, getFuelPressureUnit } from "@/lib/units";

export const loginSchema = z.object({
  username: z.string().min(1, "Usuario requerido"),
  password: z.string().min(1, "Contraseña requerida"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "La contraseña actual es requerida"),
    newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme la nueva contraseña"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Las contraseñas nuevas no coinciden",
    path: ["confirmPassword"],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "La nueva contraseña no puede ser igual a la contraseña actual",
    path: ["newPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Correo inválido"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const registerSchema = z
  .object({
    email: z.string().email("Correo electrónico inválido"),
    name: z.string().min(1, "Nombre completo requerido"),
    companyName: z.string().min(1, "Nombre de empresa requerido"),
    password: z.string().min(8, "La contraseña debe tener mínimo 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme la contraseña"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

const companyAssignableRoles = [
  "COMPANY_ADMIN",
  "SUPERVISOR",
  "OPERATOR",
  "MAINTENANCE",
  "VIEWER",
] as const;

export const userSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  name: z.string().min(1).optional(),
  password: z.string().min(8).optional(),
  role: z.enum(["SUPER_ADMIN", "COMPANY_ADMIN", "SUPERVISOR", "OPERATOR", "MAINTENANCE", "VIEWER"]),
  status: z.enum(["PENDING_APPROVAL", "ACTIVE", "REJECTED", "DISABLED", "DELETED"]).optional(),
  companyId: z.string().optional().nullable(),
});

export const adminUserUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["SUPER_ADMIN", "COMPANY_ADMIN", "SUPERVISOR", "OPERATOR", "MAINTENANCE", "VIEWER"]).optional(),
  status: z.enum(["PENDING_APPROVAL", "ACTIVE", "REJECTED", "DISABLED", "DELETED"]).optional(),
  companyId: z.string().optional().nullable(),
  password: z.string().min(8).optional(),
  rejectionReason: z.string().optional().nullable(),
});

export const companySchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  status: z.enum(["ACTIVE", "DISABLED", "DELETED"]).optional(),
  logoUrl: z.string().url("URL de logo inválida").optional().nullable(),
});

export const companyLogoSchema = z.object({
  logoUrl: z.string().url("URL de logo inválida").nullable(),
});

const optionalNumber = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z.number().nullable().optional()
);

const optionalBoolean = z.preprocess((v) => {
  if (v === "true" || v === true || v === "on") return true;
  if (v === "false" || v === false || v === "off") return false;
  return v ?? false;
}, z.boolean().optional());

function validatePressureField(
  data: {
    value?: number | null;
    notApplicable?: boolean;
  },
  ctx: z.RefinementCtx,
  valuePath: string,
  label: string
) {
  if (data.notApplicable) return;
  if (data.value != null && (Number.isNaN(data.value) || typeof data.value !== "number")) {
    ctx.addIssue({ code: "custom", message: `${label} debe ser numérico`, path: [valuePath] });
  }
}

export const boilerSchema = z
  .object({
    internalId: z.string().min(1),
    name: z.string().min(1),
    brand: z.string().optional(),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    capacityHp: optionalNumber,
    capacityKgH: optionalNumber,
    capacityLbH: optionalNumber,
    type: z.enum(["TUBOS_HUMO", "ACUOTUBULAR", "AGUA_CALIENTE", "ACEITE_TERMICO", "MIXTA", "OTRO"]),
    customType: z.string().optional().nullable(),
    fuelType: z.enum(["GAS_NATURAL", "GAS_LP", "DIESEL", "COMBUSTOLEO", "DUAL", "BIOMASA", "OTRO"]),
    customFuelType: z.string().optional().nullable(),
    designPressureKgCm2: optionalNumber,
    designPressureNotApplicable: optionalBoolean,
    operatingPressureKgCm2: optionalNumber,
    operatingPressureNotApplicable: optionalBoolean,
    operatingTemperatureC: optionalNumber,
    operatingTemperatureNotApplicable: optionalBoolean,
    location: z.string().optional(),
    plantId: z.string().optional().nullable(),
    companyId: z.string().optional().nullable(),
    installationDate: z.string().optional().nullable(),
    lastInspectionDate: z.string().optional().nullable(),
    nextInspectionDate: z.string().optional().nullable(),
    status: z.enum(["OPERANDO", "FUERA_SERVICIO", "MANTENIMIENTO", "STANDBY"]),
    technicalNotes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "OTRO" && !data.customType?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Especificar tipo de equipo es obligatorio cuando el tipo es Otro",
        path: ["customType"],
      });
    }
    if (data.fuelType === "OTRO" && !data.customFuelType?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Especificar combustible es obligatorio cuando el combustible es Otro",
        path: ["customFuelType"],
      });
    }
    validatePressureField(
      { value: data.designPressureKgCm2, notApplicable: data.designPressureNotApplicable },
      ctx,
      "designPressureKgCm2",
      "Presión de diseño"
    );
    validatePressureField(
      { value: data.operatingPressureKgCm2, notApplicable: data.operatingPressureNotApplicable },
      ctx,
      "operatingPressureKgCm2",
      "Presión de operación"
    );
    validatePressureField(
      { value: data.operatingTemperatureC, notApplicable: data.operatingTemperatureNotApplicable },
      ctx,
      "operatingTemperatureC",
      "Temperatura de operación"
    );
  })
  .transform((data) => ({
    ...data,
    customType: data.type === "OTRO" ? data.customType?.trim() || null : null,
    customFuelType: data.fuelType === "OTRO" ? data.customFuelType?.trim() || null : null,
    designPressureKgCm2: data.designPressureNotApplicable ? null : data.designPressureKgCm2 ?? null,
    operatingPressureKgCm2: data.operatingPressureNotApplicable ? null : data.operatingPressureKgCm2 ?? null,
    operatingTemperatureC: data.operatingTemperatureNotApplicable ? null : data.operatingTemperatureC ?? null,
  }));

export const operatingLimitsSchema = z
  .object({
    pressureMinKgCm2: optionalNumber,
    pressureMaxKgCm2: optionalNumber,
    temperatureMinC: optionalNumber,
    temperatureMaxC: optionalNumber,
    waterLevelMinPercent: optionalNumber,
    waterLevelMaxPercent: optionalNumber,
    conductivityMaxUsCm: optionalNumber,
    tdsMaxPpm: optionalNumber,
    phMin: optionalNumber,
    phMax: optionalNumber,
    hardnessMaxPpm: optionalNumber,
    o2MinPercent: optionalNumber,
    o2MaxPercent: optionalNumber,
    coMaxPpm: optionalNumber,
    stackTemperatureMaxC: optionalNumber,
    gasPressureMin: optionalNumber,
    gasPressureMax: optionalNumber,
    airPressureMin: optionalNumber,
    airPressureMax: optionalNumber,
  })
  .superRefine((data, ctx) => {
    const pairs: [string, string, keyof typeof data][] = [
      ["pressureMinKgCm2", "pressureMaxKgCm2", "pressureMinKgCm2"],
      ["temperatureMinC", "temperatureMaxC", "temperatureMinC"],
      ["phMin", "phMax", "phMin"],
      ["o2MinPercent", "o2MaxPercent", "o2MinPercent"],
      ["gasPressureMin", "gasPressureMax", "gasPressureMin"],
      ["airPressureMin", "airPressureMax", "airPressureMin"],
    ];
    for (const [minKey, maxKey, field] of pairs) {
      const min = data[minKey as keyof typeof data] as number | null | undefined;
      const max = data[maxKey as keyof typeof data] as number | null | undefined;
      if (min != null && max != null && min > max) {
        ctx.addIssue({
          code: "custom",
          message: "El mínimo no puede ser mayor que el máximo",
          path: [field],
        });
      }
    }
  });

const checklistItemSchema = z.object({
  itemKey: z.string(),
  itemLabel: z.string(),
  response: z.enum(["CUMPLE", "NO_CUMPLE", "NO_APLICA"]),
  observation: z.string().optional(),
});

export const boilerLogSchema = z
  .object({
    boilerId: z.string().min(1, "Caldera requerida"),
    operatorId: z.string().min(1, "Operador requerido"),
    shift: z.enum(["MATUTINO", "VESPERTINO", "NOCTURNO", "PERSONALIZADO"]),
    customShift: z.string().optional(),
    accumulatedHours: optionalNumber,
    loadLevel: z.enum(["BAJA", "MEDIA", "ALTA", "PORCENTAJE_MANUAL"]).optional().nullable(),
    loadPercentage: optionalNumber,
    operationalState: z.enum(["NORMAL", "OBSERVACION", "ALARMA", "FUERA_SERVICIO"]),
    steamPressureKgCm2: optionalNumber,
    steamTemperatureC: optionalNumber,
    feedwaterPressureKgCm2: optionalNumber,
    feedwaterTemperatureC: optionalNumber,
    condensateReturnTemperatureC: optionalNumber,
    waterLevelPercent: optionalNumber,
    feedPumpStatus: z.string().optional(),
    alternatePumpStatus: z.string().optional(),
    feedPumpPressureKgCm2: optionalNumber,
    alternatePumpPressureKgCm2: optionalNumber,
    fuelPressureValue: optionalNumber,
    fuelPressureUnit: z.enum(["IN_H2O", "KG_CM2"]).optional().nullable(),
    operatingFuelType: z.string().optional().nullable(),
    fuelConsumptionValue: optionalNumber,
    fuelConsumptionUnit: z.enum(["M3N", "L", "KG"]).optional().nullable(),
    airPressure: optionalNumber,
    fanFrequencyHz: optionalNumber,
    modulationPositionDegrees: optionalNumber,
    generalObservations: z.string().optional(),
    abnormalCondition: z.string().optional(),
    immediateCorrectiveAction: z.string().optional(),
    requiresMaintenance: z.boolean().default(false),
    maintenancePriority: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]).optional().nullable(),
    operatorSignature: z.string().optional(),
    status: z.enum(["BORRADOR", "ENVIADO", "REVISADO", "APROBADO", "RECHAZADO", "BLOQUEADO"]).optional(),
    boilerFuelType: z.string().optional(),
    combustion: z
      .object({
        flueGasTemperatureC: optionalNumber,
        o2Percent: optionalNumber,
        coPpm: optionalNumber,
        co2Percent: optionalNumber,
        excessAirPercent: optionalNumber,
        estimatedEfficiencyPercent: optionalNumber,
        steamFlowKgH: optionalNumber,
      })
      .optional(),
    waterTreatment: z
      .object({
        ph: optionalNumber,
        conductivityUsCm: optionalNumber,
        tdsPpm: optionalNumber,
        tdsConversionFactor: optionalNumber,
        hardnessPpmAsCaCO3: optionalNumber,
        sulfitesPpm: optionalNumber,
        phosphatesPpm: optionalNumber,
        alkalinityPpmAsCaCO3: optionalNumber,
        chloridesPpm: optionalNumber,
        bottomBlowdownDone: z.boolean().default(false),
        surfaceBlowdownDone: z.boolean().default(false),
        softenerInService: z.boolean().default(false),
        regenerationDone: z.boolean().default(false),
        observations: z.string().optional(),
      })
      .optional(),
    safetyChecklist: z.array(checklistItemSchema).optional(),
  })
  .superRefine((data, ctx) => {
    const boilerFuel = data.boilerFuelType || "";
    if (boilerFuel === "DUAL" && !data.operatingFuelType) {
      ctx.addIssue({
        code: "custom",
        message: "Combustible en operación es obligatorio para equipos Dual",
        path: ["operatingFuelType"],
      });
    }
    const effectiveFuel = boilerFuel === "DUAL" ? data.operatingFuelType || "" : boilerFuel;
    if (effectiveFuel === "OTRO" && data.fuelConsumptionValue != null && !data.fuelConsumptionUnit) {
      ctx.addIssue({
        code: "custom",
        message: "Seleccione unidad de consumo de combustible",
        path: ["fuelConsumptionUnit"],
      });
    }
    if (data.fuelPressureValue != null && !data.fuelPressureUnit && effectiveFuel) {
      ctx.addIssue({
        code: "custom",
        message: "Unidad de presión de combustible requerida",
        path: ["fuelPressureUnit"],
      });
    }
    if (data.fuelConsumptionValue != null && !data.fuelConsumptionUnit && effectiveFuel && effectiveFuel !== "OTRO") {
      ctx.addIssue({
        code: "custom",
        message: "Unidad de consumo de combustible requerida",
        path: ["fuelConsumptionUnit"],
      });
    }
  })
  .transform((data) => {
    const boilerFuel = data.boilerFuelType || "";
    const effectiveFuel = boilerFuel === "DUAL" ? data.operatingFuelType || "" : boilerFuel;
    const fuelPressureUnit =
      data.fuelPressureUnit ||
      (effectiveFuel ? getFuelPressureUnit(effectiveFuel) : null);
    const fuelConsumptionUnit =
      data.fuelConsumptionUnit ||
      (effectiveFuel && effectiveFuel !== "OTRO" ? getDefaultFuelConsumptionUnit(effectiveFuel) : null);

    const { boilerFuelType: _, ...rest } = data;
    return {
      ...rest,
      fuelPressureUnit,
      fuelConsumptionUnit,
    };
  });

export const maintenanceSchema = z.object({
  boilerId: z.string().min(1),
  type: z.enum(["PREVENTIVO", "CORRECTIVO", "PREDICTIVO", "INSPECCION"]),
  priority: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]),
  scheduledDate: z.string().optional().nullable(),
  responsibleId: z.string().optional().nullable(),
  description: z.string().min(1),
  finding: z.string().optional(),
  actionTaken: z.string().optional(),
  partsUsed: z.string().optional(),
  status: z.enum(["ABIERTA", "PROGRAMADA", "EN_PROCESO", "CERRADA", "CANCELADA"]).optional(),
  alertId: z.string().optional().nullable(),
  boilerLogId: z.string().optional().nullable(),
});

export const closeAlertSchema = z.object({
  closeComments: z.string().min(1, "Comentario requerido para cerrar alerta"),
});

export const approveLogSchema = z.object({
  action: z.enum(["APROBAR", "RECHAZAR", "BLOQUEAR", "REVISAR"]),
  supervisorComments: z.string().optional(),
});

export const plantSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  client: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  contact: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Correo inválido").optional().nullable().or(z.literal("")),
  notes: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
});

export const plantUpdateSchema = plantSchema.partial().extend({
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

export { companyAssignableRoles };
