-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'MANTENIMIENTO', 'SOLO_CONSULTA');

-- CreateEnum
CREATE TYPE "BoilerType" AS ENUM ('TUBOS_HUMO', 'ACUOTUBULAR', 'AGUA_CALIENTE', 'ACEITE_TERMICO', 'OTRO');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('GAS_NATURAL', 'GAS_LP', 'DIESEL', 'COMBUSTOLEO', 'DUAL', 'OTRO');

-- CreateEnum
CREATE TYPE "BoilerStatus" AS ENUM ('OPERANDO', 'FUERA_SERVICIO', 'MANTENIMIENTO', 'STANDBY');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('MATUTINO', 'VESPERTINO', 'NOCTURNO', 'PERSONALIZADO');

-- CreateEnum
CREATE TYPE "LoadLevel" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'PORCENTAJE_MANUAL');

-- CreateEnum
CREATE TYPE "LogOperationalState" AS ENUM ('NORMAL', 'OBSERVACION', 'ALARMA', 'FUERA_SERVICIO');

-- CreateEnum
CREATE TYPE "ChecklistResponse" AS ENUM ('CUMPLE', 'NO_CUMPLE', 'NO_APLICA');

-- CreateEnum
CREATE TYPE "LogStatus" AS ENUM ('BORRADOR', 'ENVIADO', 'REVISADO', 'APROBADO', 'RECHAZADO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "MaintenancePriority" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('NORMAL', 'ADVERTENCIA', 'CRITICO');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ABIERTA', 'EN_REVISION', 'CERRADA');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('PREVENTIVO', 'CORRECTIVO', 'PREDICTIVO', 'INSPECCION');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('ABIERTA', 'PROGRAMADA', 'EN_PROCESO', 'CERRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREAR_REGISTRO', 'EDITAR_REGISTRO', 'APROBAR_REGISTRO', 'RECHAZAR_REGISTRO', 'BLOQUEAR_REGISTRO', 'CREAR_USUARIO', 'CAMBIAR_CONTRASENA', 'CERRAR_ALERTA', 'CREAR_MANTENIMIENTO', 'CERRAR_MANTENIMIENTO', 'CAMBIAR_LIMITES_CALDERA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERADOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Boiler" (
    "id" TEXT NOT NULL,
    "internalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "capacityHp" DOUBLE PRECISION,
    "capacityKgH" DOUBLE PRECISION,
    "capacityLbH" DOUBLE PRECISION,
    "type" "BoilerType" NOT NULL,
    "fuelType" "FuelType" NOT NULL,
    "designPressure" DOUBLE PRECISION,
    "operatingPressure" DOUBLE PRECISION,
    "operatingTemperature" DOUBLE PRECISION,
    "location" TEXT,
    "installationDate" TIMESTAMP(3),
    "lastInspectionDate" TIMESTAMP(3),
    "nextInspectionDate" TIMESTAMP(3),
    "status" "BoilerStatus" NOT NULL DEFAULT 'OPERANDO',
    "technicalNotes" TEXT,
    "plantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Boiler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoilerOperatingLimit" (
    "id" TEXT NOT NULL,
    "boilerId" TEXT NOT NULL,
    "pressureMin" DOUBLE PRECISION,
    "pressureMax" DOUBLE PRECISION,
    "temperatureMin" DOUBLE PRECISION,
    "temperatureMax" DOUBLE PRECISION,
    "waterLevelMin" DOUBLE PRECISION,
    "waterLevelMax" DOUBLE PRECISION,
    "conductivityMax" DOUBLE PRECISION,
    "tdsMax" DOUBLE PRECISION,
    "phMin" DOUBLE PRECISION,
    "phMax" DOUBLE PRECISION,
    "hardnessMax" DOUBLE PRECISION,
    "o2Min" DOUBLE PRECISION,
    "o2Max" DOUBLE PRECISION,
    "coMax" DOUBLE PRECISION,
    "flueGasTempMax" DOUBLE PRECISION,
    "gasPressureMin" DOUBLE PRECISION,
    "gasPressureMax" DOUBLE PRECISION,
    "airPressureMin" DOUBLE PRECISION,
    "airPressureMax" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoilerOperatingLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoilerLog" (
    "id" TEXT NOT NULL,
    "logDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "boilerId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "shift" "ShiftType" NOT NULL,
    "customShift" TEXT,
    "accumulatedHours" DOUBLE PRECISION,
    "loadLevel" "LoadLevel",
    "loadPercentage" DOUBLE PRECISION,
    "operationalState" "LogOperationalState" NOT NULL DEFAULT 'NORMAL',
    "steamPressure" DOUBLE PRECISION,
    "steamTemperature" DOUBLE PRECISION,
    "feedwaterPressure" DOUBLE PRECISION,
    "feedwaterTemperature" DOUBLE PRECISION,
    "condensateReturnTemp" DOUBLE PRECISION,
    "waterLevel" DOUBLE PRECISION,
    "feedPumpStatus" TEXT,
    "alternatePumpStatus" TEXT,
    "fuelPressure" DOUBLE PRECISION,
    "airPressure" DOUBLE PRECISION,
    "fanFrequency" DOUBLE PRECISION,
    "modulationPosition" DOUBLE PRECISION,
    "generalObservations" TEXT,
    "abnormalCondition" TEXT,
    "immediateCorrectiveAction" TEXT,
    "requiresMaintenance" BOOLEAN NOT NULL DEFAULT false,
    "maintenancePriority" "MaintenancePriority",
    "operatorSignature" TEXT,
    "supervisorComments" TEXT,
    "status" "LogStatus" NOT NULL DEFAULT 'BORRADOR',
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentLogId" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoilerLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoilerLogCombustion" (
    "id" TEXT NOT NULL,
    "boilerLogId" TEXT NOT NULL,
    "flueGasTemperature" DOUBLE PRECISION,
    "o2" DOUBLE PRECISION,
    "co" DOUBLE PRECISION,
    "co2" DOUBLE PRECISION,
    "excessAir" DOUBLE PRECISION,
    "estimatedEfficiency" DOUBLE PRECISION,
    "fuelConsumption" DOUBLE PRECISION,
    "steamFlow" DOUBLE PRECISION,

    CONSTRAINT "BoilerLogCombustion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoilerLogWaterTreatment" (
    "id" TEXT NOT NULL,
    "boilerLogId" TEXT NOT NULL,
    "ph" DOUBLE PRECISION,
    "conductivity" DOUBLE PRECISION,
    "tds" DOUBLE PRECISION,
    "hardness" DOUBLE PRECISION,
    "sulfites" DOUBLE PRECISION,
    "phosphates" DOUBLE PRECISION,
    "alkalinity" DOUBLE PRECISION,
    "chlorides" DOUBLE PRECISION,
    "bottomBlowdownDone" BOOLEAN NOT NULL DEFAULT false,
    "surfaceBlowdownDone" BOOLEAN NOT NULL DEFAULT false,
    "softenerInService" BOOLEAN NOT NULL DEFAULT false,
    "regenerationDone" BOOLEAN NOT NULL DEFAULT false,
    "observations" TEXT,

    CONSTRAINT "BoilerLogWaterTreatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoilerLogSafetyChecklist" (
    "id" TEXT NOT NULL,
    "boilerLogId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "itemLabel" TEXT NOT NULL,
    "response" "ChecklistResponse" NOT NULL DEFAULT 'CUMPLE',
    "observation" TEXT,

    CONSTRAINT "BoilerLogSafetyChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "alertDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "boilerId" TEXT NOT NULL,
    "boilerLogId" TEXT,
    "parameter" TEXT NOT NULL,
    "recordedValue" TEXT,
    "configuredLimit" TEXT,
    "severity" "AlertSeverity" NOT NULL,
    "capturedById" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'ABIERTA',
    "closeComments" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "boilerId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledDate" TIMESTAMP(3),
    "responsibleId" TEXT,
    "description" TEXT NOT NULL,
    "finding" TEXT,
    "actionTaken" TEXT,
    "partsUsed" TEXT,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'ABIERTA',
    "alertId" TEXT,
    "boilerLogId" TEXT,
    "closedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceEvidence" (
    "id" TEXT NOT NULL,
    "maintenanceOrderId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "boilerLogId" TEXT,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParameterDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParameterDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "module" TEXT NOT NULL,
    "recordId" TEXT,
    "previousValue" TEXT,
    "newValue" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Boiler_internalId_key" ON "Boiler"("internalId");

-- CreateIndex
CREATE UNIQUE INDEX "BoilerOperatingLimit_boilerId_key" ON "BoilerOperatingLimit"("boilerId");

-- CreateIndex
CREATE INDEX "BoilerLog_logDate_idx" ON "BoilerLog"("logDate");

-- CreateIndex
CREATE INDEX "BoilerLog_boilerId_idx" ON "BoilerLog"("boilerId");

-- CreateIndex
CREATE INDEX "BoilerLog_operatorId_idx" ON "BoilerLog"("operatorId");

-- CreateIndex
CREATE INDEX "BoilerLog_status_idx" ON "BoilerLog"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BoilerLogCombustion_boilerLogId_key" ON "BoilerLogCombustion"("boilerLogId");

-- CreateIndex
CREATE UNIQUE INDEX "BoilerLogWaterTreatment_boilerLogId_key" ON "BoilerLogWaterTreatment"("boilerLogId");

-- CreateIndex
CREATE UNIQUE INDEX "BoilerLogSafetyChecklist_boilerLogId_itemKey_key" ON "BoilerLogSafetyChecklist"("boilerLogId", "itemKey");

-- CreateIndex
CREATE INDEX "Alert_alertDate_idx" ON "Alert"("alertDate");

-- CreateIndex
CREATE INDEX "Alert_boilerId_idx" ON "Alert"("boilerId");

-- CreateIndex
CREATE INDEX "Alert_status_idx" ON "Alert"("status");

-- CreateIndex
CREATE INDEX "Alert_severity_idx" ON "Alert"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceOrder_orderNumber_key" ON "MaintenanceOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "MaintenanceOrder_status_idx" ON "MaintenanceOrder"("status");

-- CreateIndex
CREATE INDEX "MaintenanceOrder_boilerId_idx" ON "MaintenanceOrder"("boilerId");

-- CreateIndex
CREATE UNIQUE INDEX "ParameterDefinition_key_key" ON "ParameterDefinition"("key");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- AddForeignKey
ALTER TABLE "Boiler" ADD CONSTRAINT "Boiler_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoilerOperatingLimit" ADD CONSTRAINT "BoilerOperatingLimit_boilerId_fkey" FOREIGN KEY ("boilerId") REFERENCES "Boiler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoilerLog" ADD CONSTRAINT "BoilerLog_boilerId_fkey" FOREIGN KEY ("boilerId") REFERENCES "Boiler"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoilerLog" ADD CONSTRAINT "BoilerLog_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoilerLog" ADD CONSTRAINT "BoilerLog_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoilerLog" ADD CONSTRAINT "BoilerLog_parentLogId_fkey" FOREIGN KEY ("parentLogId") REFERENCES "BoilerLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoilerLogCombustion" ADD CONSTRAINT "BoilerLogCombustion_boilerLogId_fkey" FOREIGN KEY ("boilerLogId") REFERENCES "BoilerLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoilerLogWaterTreatment" ADD CONSTRAINT "BoilerLogWaterTreatment_boilerLogId_fkey" FOREIGN KEY ("boilerLogId") REFERENCES "BoilerLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoilerLogSafetyChecklist" ADD CONSTRAINT "BoilerLogSafetyChecklist_boilerLogId_fkey" FOREIGN KEY ("boilerLogId") REFERENCES "BoilerLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_boilerId_fkey" FOREIGN KEY ("boilerId") REFERENCES "Boiler"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_boilerLogId_fkey" FOREIGN KEY ("boilerLogId") REFERENCES "BoilerLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_capturedById_fkey" FOREIGN KEY ("capturedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceOrder" ADD CONSTRAINT "MaintenanceOrder_boilerId_fkey" FOREIGN KEY ("boilerId") REFERENCES "Boiler"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceOrder" ADD CONSTRAINT "MaintenanceOrder_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceOrder" ADD CONSTRAINT "MaintenanceOrder_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceOrder" ADD CONSTRAINT "MaintenanceOrder_boilerLogId_fkey" FOREIGN KEY ("boilerLogId") REFERENCES "BoilerLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceEvidence" ADD CONSTRAINT "MaintenanceEvidence_maintenanceOrderId_fkey" FOREIGN KEY ("maintenanceOrderId") REFERENCES "MaintenanceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_boilerLogId_fkey" FOREIGN KEY ("boilerLogId") REFERENCES "BoilerLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
