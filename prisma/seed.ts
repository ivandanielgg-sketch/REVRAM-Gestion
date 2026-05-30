import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import { SAFETY_CHECKLIST_ITEMS } from "../src/lib/constants";
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

  const plant = await prisma.plant.upsert({
    where: { id: "demo-plant-001" },
    update: { companyId: revramCompany.id },
    create: {
      id: "demo-plant-001",
      name: "Planta Demo Monterrey",
      client: "Cliente Demo S.A. de C.V.",
      location: "Monterrey, N.L.",
      companyId: revramCompany.id,
    },
  });

  const boiler = await prisma.boiler.upsert({
    where: { internalId: "CAL-001" },
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
      designPressure: 150,
      operatingPressure: 125,
      operatingTemperature: 180,
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
      pressureMin: 100,
      pressureMax: 130,
      temperatureMin: 160,
      temperatureMax: 190,
      waterLevelMin: 40,
      waterLevelMax: 60,
      conductivityMax: 3000,
      tdsMax: 1500,
      phMin: 10,
      phMax: 12,
      o2Min: 2,
      o2Max: 5,
      coMax: 100,
      flueGasTempMax: 350,
      gasPressureMin: 8,
      gasPressureMax: 14,
      airPressureMin: 4,
      airPressureMax: 8,
    },
  });

  const parameters = [
    { key: "steam_pressure", label: "Presión de vapor", unit: "psi", category: "operacion" },
    { key: "steam_temperature", label: "Temperatura de vapor", unit: "°C", category: "operacion" },
    { key: "water_level", label: "Nivel de agua", unit: "%", category: "operacion" },
    { key: "o2", label: "Oxígeno", unit: "%", category: "combustion" },
    { key: "co", label: "Monóxido de carbono", unit: "ppm", category: "combustion" },
    { key: "flue_gas_temp", label: "Temperatura de gases", unit: "°C", category: "combustion" },
    { key: "ph", label: "pH", unit: "pH", category: "agua" },
    { key: "conductivity", label: "Conductividad", unit: "µS/cm", category: "agua" },
  ];

  for (const p of parameters) {
    await prisma.parameterDefinition.upsert({
      where: { key: p.key },
      update: {},
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
      steamPressure: 122,
      steamTemperature: 175,
      waterLevel: 52,
      feedPumpStatus: "Operando",
      status: "APROBADO",
      reviewedById: supervisor.id,
      reviewedAt: new Date(),
      operatorSignature: "operador",
      combustion: {
        create: {
          flueGasTemperature: 280,
          o2: 3.2,
          co: 45,
          co2: 9.5,
          excessAir: 15,
          estimatedEfficiency: 82,
          fuelConsumption: 120,
        },
      },
      waterTreatment: {
        create: {
          ph: 10.8,
          conductivity: 2200,
          tds: 1100,
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
      steamPressure: 135,
      steamTemperature: 185,
      waterLevel: 35,
      requiresMaintenance: true,
      maintenancePriority: "CRITICA",
      abnormalCondition: "Presión elevada y nivel bajo",
      status: "ENVIADO",
      combustion: {
        create: {
          flueGasTemperature: 380,
          o2: 1.5,
          co: 150,
        },
      },
      waterTreatment: {
        create: {
          ph: 9.2,
          conductivity: 3500,
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
        parameter: "Presión de vapor",
        recordedValue: "135",
        configuredLimit: "100 - 130",
        severity: "CRITICO",
        capturedById: operator.id,
        status: "ABIERTA",
      },
      {
        boilerId: boiler.id,
        boilerLogId: log2.id,
        parameter: "Nivel de agua",
        recordedValue: "35",
        configuredLimit: "Mín: 40",
        severity: "CRITICO",
        capturedById: operator.id,
        status: "ABIERTA",
      },
      {
        boilerId: boiler.id,
        boilerLogId: log2.id,
        parameter: "Conductividad",
        recordedValue: "3500",
        configuredLimit: "Máx: 3000",
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
