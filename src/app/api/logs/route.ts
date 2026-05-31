import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { evaluateAlerts } from "@/lib/alerts";
import { boilerLogSchema } from "@/lib/validations/schemas";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/auth";
import { SAFETY_CHECKLIST_ITEMS } from "@/lib/constants";
import { parseLogsFilters, fetchFilteredLogs } from "@/lib/logs-query";
import { getBoilerForSession } from "@/lib/tenant-access";

export async function GET(request: NextRequest) {
  const { error, session } = await requirePermission(request, "logs.view");
  if (error || !session) return error;

  const filters = parseLogsFilters(new URL(request.url).searchParams);
  const logs = await fetchFilteredLogs(filters, false, session);

  return NextResponse.json(logs);
}

export async function POST(request: NextRequest) {
  const { error, session } = await requirePermission(request, "logs.create");
  if (error || !session) return error;

  const body = await request.json();
  const parsed = boilerLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const boiler = await getBoilerForSession(parsed.data.boilerId, session);
  if (!boiler) {
    return NextResponse.json({ error: "Caldera no encontrada o sin acceso" }, { status: 403 });
  }

  const data = parsed.data;
  const checklist =
    data.safetyChecklist ??
    SAFETY_CHECKLIST_ITEMS.map((item) => ({
      itemKey: item.key,
      itemLabel: item.label,
      response: "CUMPLE" as const,
      observation: "",
    }));

  const log = await prisma.boilerLog.create({
    data: {
      boilerId: data.boilerId,
      operatorId: data.operatorId,
      shift: data.shift,
      customShift: data.customShift,
      accumulatedHours: data.accumulatedHours,
      loadLevel: data.loadLevel,
      loadPercentage: data.loadPercentage,
      operationalState: data.operationalState,
      steamPressure: data.steamPressure,
      steamTemperature: data.steamTemperature,
      feedwaterPressure: data.feedwaterPressure,
      feedwaterTemperature: data.feedwaterTemperature,
      condensateReturnTemp: data.condensateReturnTemp,
      waterLevel: data.waterLevel,
      feedPumpStatus: data.feedPumpStatus,
      alternatePumpStatus: data.alternatePumpStatus,
      fuelPressure: data.fuelPressure,
      airPressure: data.airPressure,
      fanFrequency: data.fanFrequency,
      modulationPosition: data.modulationPosition,
      generalObservations: data.generalObservations,
      abnormalCondition: data.abnormalCondition,
      immediateCorrectiveAction: data.immediateCorrectiveAction,
      requiresMaintenance: data.requiresMaintenance,
      maintenancePriority: data.maintenancePriority,
      operatorSignature: data.operatorSignature,
      status: data.status || "BORRADOR",
      combustion: data.combustion ? { create: data.combustion } : undefined,
      waterTreatment: data.waterTreatment ? { create: data.waterTreatment } : undefined,
      safetyChecklist: {
        create: checklist.map((c) => ({
          itemKey: c.itemKey,
          itemLabel: c.itemLabel,
          response: c.response,
          observation: c.observation,
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

  const alertInputs = evaluateAlerts(log.boiler.operatingLimits, {
    steamPressure: log.steamPressure,
    steamTemperature: log.steamTemperature,
    waterLevel: log.waterLevel,
    ph: log.waterTreatment?.ph,
    conductivity: log.waterTreatment?.conductivity,
    o2: log.combustion?.o2,
    co: log.combustion?.co,
    flueGasTemperature: log.combustion?.flueGasTemperature,
    requiresMaintenance: log.requiresMaintenance,
    maintenancePriority: log.maintenancePriority,
    safetyChecklist: log.safetyChecklist.map((s) => ({
      itemKey: s.itemKey,
      response: s.response,
    })),
  });

  if (alertInputs.length > 0) {
    await prisma.alert.createMany({
      data: alertInputs.map((a) => ({
        boilerId: log.boilerId,
        boilerLogId: log.id,
        parameter: a.parameter,
        recordedValue: a.recordedValue,
        configuredLimit: a.configuredLimit,
        severity: a.severity,
        capturedById: session.id,
      })),
    });
  }

  await createAuditLog({
    userId: session.id,
    action: "CREAR_REGISTRO",
    module: "logs",
    recordId: log.id,
    newValue: { id: log.id, status: log.status },
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(log, { status: 201 });
}
