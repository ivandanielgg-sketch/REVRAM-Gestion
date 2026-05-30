import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { evaluateAlerts } from "@/lib/alerts";
import { boilerLogSchema } from "@/lib/validations/schemas";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/auth";
import { SAFETY_CHECKLIST_ITEMS } from "@/lib/constants";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(request, "logs.view");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const boilerId = searchParams.get("boilerId");
  const operatorId = searchParams.get("operatorId");
  const shift = searchParams.get("shift");
  const status = searchParams.get("status");
  const requiresMaintenance = searchParams.get("requiresMaintenance");
  const plantId = searchParams.get("plantId");
  const fuelType = searchParams.get("fuelType");
  const boilerType = searchParams.get("boilerType");
  const search = searchParams.get("search");
  const sortBy = searchParams.get("sortBy") || "logDate";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const where: Prisma.BoilerLogWhereInput = {};

  if (startDate || endDate) {
    where.logDate = {};
    if (startDate) where.logDate.gte = new Date(startDate);
    if (endDate) where.logDate.lte = new Date(endDate);
  }
  if (boilerId) where.boilerId = boilerId;
  if (operatorId) where.operatorId = operatorId;
  if (shift) where.shift = shift as Prisma.EnumShiftTypeFilter["equals"];
  if (status) where.status = status as Prisma.EnumLogStatusFilter["equals"];
  if (requiresMaintenance === "true") where.requiresMaintenance = true;
  if (search) {
    where.OR = [
      { generalObservations: { contains: search, mode: "insensitive" } },
      { abnormalCondition: { contains: search, mode: "insensitive" } },
    ];
  }
  if (plantId || fuelType || boilerType) {
    where.boiler = {};
    if (plantId) where.boiler.plantId = plantId;
    if (fuelType) where.boiler.fuelType = fuelType as Prisma.EnumFuelTypeFilter["equals"];
    if (boilerType) where.boiler.type = boilerType as Prisma.EnumBoilerTypeFilter["equals"];
  }

  const logs = await prisma.boilerLog.findMany({
    where,
    include: {
      boiler: { include: { plant: true } },
      operator: { select: { id: true, username: true } },
      combustion: true,
      waterTreatment: true,
      alerts: true,
      _count: { select: { safetyChecklist: true } },
    },
    orderBy: { [sortBy]: sortOrder },
    take: 500,
  });

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
