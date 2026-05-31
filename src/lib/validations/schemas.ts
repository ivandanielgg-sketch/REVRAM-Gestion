import { z } from "zod";

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
});

const optionalNumber = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z.number().nullable().optional()
);

export const boilerSchema = z.object({
  internalId: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  capacityHp: optionalNumber,
  capacityKgH: optionalNumber,
  capacityLbH: optionalNumber,
  type: z.enum(["TUBOS_HUMO", "ACUOTUBULAR", "AGUA_CALIENTE", "ACEITE_TERMICO", "OTRO"]),
  fuelType: z.enum(["GAS_NATURAL", "GAS_LP", "DIESEL", "COMBUSTOLEO", "DUAL", "OTRO"]),
  designPressure: optionalNumber,
  operatingPressure: optionalNumber,
  operatingTemperature: optionalNumber,
  location: z.string().optional(),
  plantId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  installationDate: z.string().optional().nullable(),
  lastInspectionDate: z.string().optional().nullable(),
  nextInspectionDate: z.string().optional().nullable(),
  status: z.enum(["OPERANDO", "FUERA_SERVICIO", "MANTENIMIENTO", "STANDBY"]),
  technicalNotes: z.string().optional(),
});

export const operatingLimitsSchema = z
  .object({
    pressureMin: optionalNumber,
    pressureMax: optionalNumber,
    temperatureMin: optionalNumber,
    temperatureMax: optionalNumber,
    waterLevelMin: optionalNumber,
    waterLevelMax: optionalNumber,
    conductivityMax: optionalNumber,
    tdsMax: optionalNumber,
    phMin: optionalNumber,
    phMax: optionalNumber,
    hardnessMax: optionalNumber,
    o2Min: optionalNumber,
    o2Max: optionalNumber,
    coMax: optionalNumber,
    flueGasTempMax: optionalNumber,
    gasPressureMin: optionalNumber,
    gasPressureMax: optionalNumber,
    airPressureMin: optionalNumber,
    airPressureMax: optionalNumber,
  })
  .superRefine((data, ctx) => {
    const pairs: [string, string, keyof typeof data][] = [
      ["pressureMin", "pressureMax", "pressureMin"],
      ["temperatureMin", "temperatureMax", "temperatureMin"],
      ["phMin", "phMax", "phMin"],
      ["o2Min", "o2Max", "o2Min"],
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

export const boilerLogSchema = z.object({
  boilerId: z.string().min(1, "Caldera requerida"),
  operatorId: z.string().min(1, "Operador requerido"),
  shift: z.enum(["MATUTINO", "VESPERTINO", "NOCTURNO", "PERSONALIZADO"]),
  customShift: z.string().optional(),
  accumulatedHours: optionalNumber,
  loadLevel: z.enum(["BAJA", "MEDIA", "ALTA", "PORCENTAJE_MANUAL"]).optional().nullable(),
  loadPercentage: optionalNumber,
  operationalState: z.enum(["NORMAL", "OBSERVACION", "ALARMA", "FUERA_SERVICIO"]),
  steamPressure: optionalNumber,
  steamTemperature: optionalNumber,
  feedwaterPressure: optionalNumber,
  feedwaterTemperature: optionalNumber,
  condensateReturnTemp: optionalNumber,
  waterLevel: optionalNumber,
  feedPumpStatus: z.string().optional(),
  alternatePumpStatus: z.string().optional(),
  fuelPressure: optionalNumber,
  airPressure: optionalNumber,
  fanFrequency: optionalNumber,
  modulationPosition: optionalNumber,
  generalObservations: z.string().optional(),
  abnormalCondition: z.string().optional(),
  immediateCorrectiveAction: z.string().optional(),
  requiresMaintenance: z.boolean().default(false),
  maintenancePriority: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]).optional().nullable(),
  operatorSignature: z.string().optional(),
  status: z.enum(["BORRADOR", "ENVIADO", "REVISADO", "APROBADO", "RECHAZADO", "BLOQUEADO"]).optional(),
  combustion: z
    .object({
      flueGasTemperature: optionalNumber,
      o2: optionalNumber,
      co: optionalNumber,
      co2: optionalNumber,
      excessAir: optionalNumber,
      estimatedEfficiency: optionalNumber,
      fuelConsumption: optionalNumber,
      steamFlow: optionalNumber,
    })
    .optional(),
  waterTreatment: z
    .object({
      ph: optionalNumber,
      conductivity: optionalNumber,
      tds: optionalNumber,
      hardness: optionalNumber,
      sulfites: optionalNumber,
      phosphates: optionalNumber,
      alkalinity: optionalNumber,
      chlorides: optionalNumber,
      bottomBlowdownDone: z.boolean().default(false),
      surfaceBlowdownDone: z.boolean().default(false),
      softenerInService: z.boolean().default(false),
      regenerationDone: z.boolean().default(false),
      observations: z.string().optional(),
    })
    .optional(),
  safetyChecklist: z.array(checklistItemSchema).optional(),
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
  name: z.string().min(1),
  client: z.string().min(1),
  location: z.string().optional(),
});
