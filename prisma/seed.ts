import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import { SAFETY_CHECKLIST_ITEMS } from "../src/lib/constants";
import { normalizePlantName } from "../src/lib/plant-utils";
import { getPgPoolConfig } from "../src/lib/db-pool";
import { ensureDefaultUsers } from "./ensure-default-users";

const pool = new pg.Pool(getPgPoolConfig(process.env.DATABASE_URL!));
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  await ensureDefaultUsers(prisma);

  const admin = await prisma.user.findUniqueOrThrow({ where: { username: "admin" } });
  const supervisor = await prisma.user.findUniqueOrThrow({ where: { username: "supervisor" } });
  const operator = await prisma.user.findUniqueOrThrow({ where: { username: "operador" } });

  const revramCompany = await prisma.company.upsert({
    where: { id: "revram-company-001" },
    update: {},
    create: { id: "revram-company-001", name: "REVRAM", status: "ACTIVE" },
  });

  const plantName = "Planta Demo Monterrey";
  const plant = await prisma.plant.upsert({
    where: {
      companyId_normalizedName: {
        companyId: revramCompany.id,
        normalizedName: normalizePlantName(plantName),
      },
    },
    update: { companyId: revramCompany.id },
    create: {
      id: "demo-plant-001",
      name: plantName,
      normalizedName: normalizePlantName(plantName),
      client: "Cliente Demo S.A. de C.V.",
      location: "Monterrey, N.L.",
      address: "Monterrey, N.L.",
      companyId: revramCompany.id,
    },
  });

  const boiler = await prisma.boiler.upsert({
    where: {
      companyId_internalId: {
        companyId: revramCompany.id,
        internalId: "CAL-001",
      },
    },
    update: { companyId: revramCompany.id },
    create: {
      internalId: "CAL-001",
      name: "Caldera Demo CB-200",
      brand: "Cleaver-Brooks",
      model: "CB-200",
      serialNumber: "CB200-DEMO-001",
      capacityHp: 200,
      capacityKgH: 3200,
      type: "ACUOTUBULAR",
      fuelType: "GAS_NATURAL",
      designPressureKgCm2: 15,
      operatingPressureKgCm2: 12.5,
      operatingTemperatureC: 180,
      location: "Cuarto de calderas - Planta 1",
      status: "OPERANDO",
      plantId: plant.id,
      companyId: revramCompany.id,
      technicalNotes: "Caldera demo para pruebas del sistema de bitácora.",
    },
  });

  await prisma.boilerOperatingLimit.upsert({
    where: { boilerId: boiler.id },
    update: {},
    create: {
      boilerId: boiler.id,
      pressureMinKgCm2: 10,
      pressureMaxKgCm2: 13,
      temperatureMinC: 160,
      temperatureMaxC: 190,
      waterLevelMinPercent: 40,
      waterLevelMaxPercent: 60,
      conductivityMaxUsCm: 3000,
      tdsMaxPpm: 1500,
      phMin: 10,
      phMax: 12,
      o2MinPercent: 2,
      o2MaxPercent: 5,
      coMaxPpm: 100,
      stackTemperatureMaxC: 350,
      gasPressureMin: 8,
      gasPressureMax: 14,
      airPressureMin: 4,
      airPressureMax: 8,
    },
  });

  const parameters = [
    { key: "steam_pressure", label: "Presión de vapor", unit: "kg/cm²", category: "operacion" },
    { key: "steam_temperature", label: "Temperatura de vapor", unit: "°C", category: "operacion" },
    { key: "water_level", label: "Nivel de agua", unit: "%", category: "operacion" },
    { key: "o2", label: "Oxígeno", unit: "%", category: "combustion" },
    { key: "co", label: "Monóxido de carbono", unit: "ppm", category: "combustion" },
    { key: "flue_gas_temp", label: "Temperatura de gases", unit: "°C", category: "combustion" },
    { key: "ph", label: "pH", unit: "pH", category: "agua" },
    { key: "conductivity", label: "Conductividad", unit: "μS/cm", category: "agua" },
    { key: "tds", label: "TDS", unit: "ppm", category: "agua" },
  ];

  for (const p of parameters) {
    await prisma.parameterDefinition.upsert({
      where: { key: p.key },
      update: { unit: p.unit, label: p.label },
      create: p,
    });
  }

  const demoDataExists = await prisma.maintenanceOrder.findUnique({
    where: { orderNumber: "OM-DEMO-001" },
  });

  if (demoDataExists) {
    console.log("Demo data already exists, skipping sample logs and orders.");
    console.log("Admin: admin (use npm run reset-admin to restore cambiar123)");
    return;
  }

  await prisma.boilerLog.create({
    data: {
      boilerId: boiler.id,
      operatorId: operator.id,
      shift: "MATUTINO",
      accumulatedHours: 12500,
      loadLevel: "MEDIA",
      operationalState: "NORMAL",
      steamPressureKgCm2: 12.2,
      steamTemperatureC: 175,
      waterLevelPercent: 52,
      feedPumpStatus: "Operando",
      fuelPressureValue: 12,
      fuelPressureUnit: "IN_H2O",
      fuelConsumptionValue: 120,
      fuelConsumptionUnit: "M3N",
      status: "APROBADO",
      reviewedById: supervisor.id,
      reviewedAt: new Date(),
      operatorSignature: "operador",
      combustion: {
        create: {
          flueGasTemperatureC: 280,
          o2Percent: 3.2,
          coPpm: 45,
          co2Percent: 9.5,
          excessAirPercent: 15,
          estimatedEfficiencyPercent: 82,
          steamFlowKgH: 3000,
        },
      },
      waterTreatment: {
        create: {
          ph: 10.8,
          conductivityUsCm: 2200,
          tdsPpm: 1100,
          bottomBlowdownDone: true,
          softenerInService: true,
        },
      },
      safetyChecklist: {
        create: SAFETY_CHECKLIST_ITEMS.map((item) => ({
          itemKey: item.key,
          itemLabel: item.label,
          response: "CUMPLE",
        })),
      },
    },
  });

  const log2 = await prisma.boilerLog.create({
    data: {
      boilerId: boiler.id,
      operatorId: operator.id,
      shift: "VESPERTINO",
      operationalState: "ALARMA",
      steamPressureKgCm2: 13.5,
      steamTemperatureC: 185,
      waterLevelPercent: 35,
      fuelPressureValue: 11,
      fuelPressureUnit: "IN_H2O",
      requiresMaintenance: true,
      maintenancePriority: "CRITICA",
      abnormalCondition: "Presión elevada y nivel bajo",
      status: "ENVIADO",
      combustion: {
        create: {
          flueGasTemperatureC: 380,
          o2Percent: 1.5,
          coPpm: 150,
        },
      },
      waterTreatment: {
        create: {
          ph: 9.2,
          conductivityUsCm: 3500,
        },
      },
      safetyChecklist: {
        create: SAFETY_CHECKLIST_ITEMS.map((item) => ({
          itemKey: item.key,
          itemLabel: item.label,
          response: item.key === "low_water_tested" ? "NO_CUMPLE" : "CUMPLE",
        })),
      },
    },
  });

  await prisma.alert.createMany({
    data: [
      {
        boilerId: boiler.id,
        boilerLogId: log2.id,
        parameter: "Presión de vapor (kg/cm²)",
        recordedValue: "13.5 kg/cm²",
        configuredLimit: "10 - 13 kg/cm²",
        severity: "CRITICO",
        capturedById: operator.id,
        status: "ABIERTA",
      },
      {
        boilerId: boiler.id,
        boilerLogId: log2.id,
        parameter: "Nivel de agua (%)",
        recordedValue: "35 %",
        configuredLimit: "Mín: 40 %",
        severity: "CRITICO",
        capturedById: operator.id,
        status: "ABIERTA",
      },
      {
        boilerId: boiler.id,
        boilerLogId: log2.id,
        parameter: "Conductividad (μS/cm)",
        recordedValue: "3500 μS/cm",
        configuredLimit: "Máx: 3000 μS/cm",
        severity: "ADVERTENCIA",
        capturedById: operator.id,
        status: "ABIERTA",
      },
    ],
  });

  await prisma.maintenanceOrder.create({
    data: {
      orderNumber: "OM-DEMO-001",
      boilerId: boiler.id,
      type: "CORRECTIVO",
      priority: "ALTA",
      description: "Revisión por presión elevada detectada en bitácora vespertina",
      finding: "Presión fuera de rango operativo",
      status: "ABIERTA",
      boilerLogId: log2.id,
      responsibleId: admin.id,
    },
  });

  console.log("Seed completed.");
  console.log("Admin: admin / cambiar123 (debe cambiar contraseña en primer acceso)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
