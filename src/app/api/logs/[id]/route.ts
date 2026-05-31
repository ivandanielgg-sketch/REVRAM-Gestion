import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { canEditLog, canApproveLog } from "@/lib/permissions";
import { isLogCompleteForApproval } from "@/lib/alerts";
import { boilerLogSchema, approveLogSchema } from "@/lib/validations/schemas";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/auth";
import { SAFETY_CHECKLIST_ITEMS } from "@/lib/constants";
import { getLogForSession, getBoilerForSession } from "@/lib/tenant-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requirePermission(request, "logs.view");
  if (error || !session) return error;

  const { id } = await params;
  const access = await getLogForSession(id, session);
  if (!access) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const log = await prisma.boilerLog.findUnique({
    where: { id },
    include: {
      boiler: { include: { plant: true, operatingLimits: true } },
      operator: { select: { id: true, username: true, email: true } },
      reviewedBy: { select: { id: true, username: true } },
      combustion: true,
      waterTreatment: true,
      safetyChecklist: true,
      alerts: true,
      attachments: true,
      childVersions: { select: { id: true, version: true, status: true, createdAt: true } },
    },
  });
  if (!log) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(log);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requirePermission(request, "logs.edit");
  if (error || !session) return error;

  const { id } = await params;
  const access = await getLogForSession(id, session);
  if (!access) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const existing = await prisma.boilerLog.findUnique({
    where: { id },
    include: { safetyChecklist: true },
  });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (!canEditLog(session.role, existing.status)) {
    return NextResponse.json(
      { error: "Los registros aprobados no pueden editarse. Cree una nueva versión." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = boilerLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const data = parsed.data;
  await prisma.boilerLogSafetyChecklist.deleteMany({ where: { boilerLogId: id } });

  const log = await prisma.boilerLog.update({
    where: { id },
    data: {
      shift: data.shift,
      customShift: data.customShift,
      accumulatedHours: data.accumulatedHours,
      loadLevel: data.loadLevel,
      loadPercentage: data.loadPercentage,
      operationalState: data.operationalState,
      steamPressureKgCm2: data.steamPressureKgCm2,
      steamTemperatureC: data.steamTemperatureC,
      feedwaterPressureKgCm2: data.feedwaterPressureKgCm2,
      feedwaterTemperatureC: data.feedwaterTemperatureC,
      condensateReturnTemperatureC: data.condensateReturnTemperatureC,
      waterLevelPercent: data.waterLevelPercent,
      feedPumpStatus: data.feedPumpStatus,
      alternatePumpStatus: data.alternatePumpStatus,
      feedPumpPressureKgCm2: data.feedPumpPressureKgCm2,
      alternatePumpPressureKgCm2: data.alternatePumpPressureKgCm2,
      fuelPressureValue: data.fuelPressureValue,
      fuelPressureUnit: data.fuelPressureUnit,
      operatingFuelType: data.operatingFuelType,
      fuelConsumptionValue: data.fuelConsumptionValue,
      fuelConsumptionUnit: data.fuelConsumptionUnit,
      airPressure: data.airPressure,
      fanFrequencyHz: data.fanFrequencyHz,
      modulationPositionDegrees: data.modulationPositionDegrees,
      generalObservations: data.generalObservations,
      abnormalCondition: data.abnormalCondition,
      immediateCorrectiveAction: data.immediateCorrectiveAction,
      requiresMaintenance: data.requiresMaintenance,
      maintenancePriority: data.maintenancePriority,
      operatorSignature: data.operatorSignature,
      status: data.status,
      combustion: data.combustion
        ? { upsert: { create: data.combustion, update: data.combustion } }
        : undefined,
      waterTreatment: data.waterTreatment
        ? { upsert: { create: data.waterTreatment, update: data.waterTreatment } }
        : undefined,
      safetyChecklist: {
        create: (data.safetyChecklist ?? SAFETY_CHECKLIST_ITEMS.map((i) => ({
          itemKey: i.key,
          itemLabel: i.label,
          response: "CUMPLE" as const,
        }))).map((c) => ({
          itemKey: c.itemKey,
          itemLabel: c.itemLabel,
          response: c.response,
          observation: "observation" in c ? c.observation : undefined,
        })),
      },
    },
    include: {
      combustion: true,
      waterTreatment: true,
      safetyChecklist: true,
      boiler: { include: { operatingLimits: true } },
    },
  });

  await createAuditLog({
    userId: session.id,
    action: "EDITAR_REGISTRO",
    module: "logs",
    recordId: id,
    previousValue: { status: existing.status },
    newValue: { status: log.status },
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(log);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requirePermission(request, "logs.approve");
  if (error || !session) return error;

  if (!canApproveLog(session.role)) {
    return NextResponse.json({ error: "Sin permiso para aprobar" }, { status: 403 });
  }

  const { id } = await params;
  const access = await getLogForSession(id, session);
  if (!access) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await request.json();
  const parsed = approveLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const log = await prisma.boilerLog.findUnique({
    where: { id },
    include: { safetyChecklist: true },
  });
  if (!log) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const action = parsed.data.action;
  let newStatus = log.status;

  if (action === "APROBAR") {
    const validation = isLogCompleteForApproval({
      boilerId: log.boilerId,
      operatorId: log.operatorId,
      shift: log.shift,
      steamPressureKgCm2: log.steamPressureKgCm2,
      waterLevelPercent: log.waterLevelPercent,
      safetyChecklist: log.safetyChecklist,
    });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(", ") }, { status: 400 });
    }
    newStatus = "APROBADO";
  } else if (action === "RECHAZAR") {
    newStatus = "RECHAZADO";
  } else if (action === "BLOQUEAR") {
    newStatus = "BLOQUEADO";
  } else if (action === "REVISAR") {
    newStatus = "REVISADO";
  }

  const updated = await prisma.boilerLog.update({
    where: { id },
    data: {
      status: newStatus,
      supervisorComments: parsed.data.supervisorComments,
      reviewedById: session.id,
      reviewedAt: new Date(),
    },
  });

  const auditAction =
    action === "APROBAR"
      ? "APROBAR_REGISTRO"
      : action === "RECHAZAR"
        ? "RECHAZAR_REGISTRO"
        : "BLOQUEAR_REGISTRO";

  await createAuditLog({
    userId: session.id,
    action: auditAction,
    module: "logs",
    recordId: id,
    previousValue: { status: log.status },
    newValue: { status: newStatus, comments: parsed.data.supervisorComments },
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(updated);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requirePermission(request, "logs.create");
  if (error || !session) return error;

  const { id } = await params;
  const access = await getLogForSession(id, session);
  if (!access) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const original = await prisma.boilerLog.findUnique({
    where: { id },
    include: { combustion: true, waterTreatment: true, safetyChecklist: true },
  });
  if (!original) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (original.status !== "APROBADO") {
    return NextResponse.json({ error: "Solo se pueden corregir registros aprobados" }, { status: 400 });
  }

  const correction = await prisma.boilerLog.create({
    data: {
      boilerId: original.boilerId,
      operatorId: original.operatorId,
      shift: original.shift,
      customShift: original.customShift,
      accumulatedHours: original.accumulatedHours,
      loadLevel: original.loadLevel,
      loadPercentage: original.loadPercentage,
      operationalState: original.operationalState,
      steamPressureKgCm2: original.steamPressureKgCm2,
      steamTemperatureC: original.steamTemperatureC,
      feedwaterPressureKgCm2: original.feedwaterPressureKgCm2,
      feedwaterTemperatureC: original.feedwaterTemperatureC,
      condensateReturnTemperatureC: original.condensateReturnTemperatureC,
      waterLevelPercent: original.waterLevelPercent,
      feedPumpStatus: original.feedPumpStatus,
      alternatePumpStatus: original.alternatePumpStatus,
      feedPumpPressureKgCm2: original.feedPumpPressureKgCm2,
      alternatePumpPressureKgCm2: original.alternatePumpPressureKgCm2,
      fuelPressureValue: original.fuelPressureValue,
      fuelPressureUnit: original.fuelPressureUnit,
      operatingFuelType: original.operatingFuelType,
      fuelConsumptionValue: original.fuelConsumptionValue,
      fuelConsumptionUnit: original.fuelConsumptionUnit,
      airPressure: original.airPressure,
      fanFrequencyHz: original.fanFrequencyHz,
      modulationPositionDegrees: original.modulationPositionDegrees,
      generalObservations: original.generalObservations,
      abnormalCondition: original.abnormalCondition,
      immediateCorrectiveAction: original.immediateCorrectiveAction,
      requiresMaintenance: original.requiresMaintenance,
      maintenancePriority: original.maintenancePriority,
      status: "BORRADOR",
      version: original.version + 1,
      parentLogId: original.id,
      combustion: original.combustion
        ? {
            create: {
              flueGasTemperatureC: original.combustion.flueGasTemperatureC,
              o2Percent: original.combustion.o2Percent,
              coPpm: original.combustion.coPpm,
              co2Percent: original.combustion.co2Percent,
              excessAirPercent: original.combustion.excessAirPercent,
              estimatedEfficiencyPercent: original.combustion.estimatedEfficiencyPercent,
              steamFlowKgH: original.combustion.steamFlowKgH,
            },
          }
        : undefined,
      waterTreatment: original.waterTreatment
        ? {
            create: {
              ph: original.waterTreatment.ph,
              conductivityUsCm: original.waterTreatment.conductivityUsCm,
              tdsPpm: original.waterTreatment.tdsPpm,
              hardnessPpmAsCaCO3: original.waterTreatment.hardnessPpmAsCaCO3,
              sulfitesPpm: original.waterTreatment.sulfitesPpm,
              phosphatesPpm: original.waterTreatment.phosphatesPpm,
              alkalinityPpmAsCaCO3: original.waterTreatment.alkalinityPpmAsCaCO3,
              chloridesPpm: original.waterTreatment.chloridesPpm,
              bottomBlowdownDone: original.waterTreatment.bottomBlowdownDone,
              surfaceBlowdownDone: original.waterTreatment.surfaceBlowdownDone,
              softenerInService: original.waterTreatment.softenerInService,
              regenerationDone: original.waterTreatment.regenerationDone,
              observations: original.waterTreatment.observations,
            },
          }
        : undefined,
      safetyChecklist: {
        create: original.safetyChecklist.map((s) => ({
          itemKey: s.itemKey,
          itemLabel: s.itemLabel,
          response: s.response,
          observation: s.observation,
        })),
      },
    },
  });

  return NextResponse.json(correction, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requirePermission(request, "logs.edit");
  if (error || !session) return error;

  const { id } = await params;
  const access = await getLogForSession(id, session);
  if (!access) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const log = await prisma.boilerLog.findUnique({ where: { id } });
  if (!log) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (log.status === "APROBADO") {
    return NextResponse.json({ error: "No se pueden eliminar registros aprobados" }, { status: 403 });
  }

  await prisma.boilerLog.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
