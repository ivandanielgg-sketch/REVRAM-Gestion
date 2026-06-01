-- CreateEnum
CREATE TYPE "PlantStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "FuelPressureUnit" AS ENUM ('IN_H2O', 'KG_CM2');
CREATE TYPE "FuelConsumptionUnit" AS ENUM ('M3N', 'L', 'KG');

-- AlterEnum BoilerType
ALTER TYPE "BoilerType" ADD VALUE IF NOT EXISTS 'MIXTA';

-- AlterEnum FuelType
ALTER TYPE "FuelType" ADD VALUE IF NOT EXISTS 'BIOMASA';

-- Company logo
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

-- Plant extensions
ALTER TABLE "Plant" ADD COLUMN IF NOT EXISTS "normalizedName" TEXT;
ALTER TABLE "Plant" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Plant" ADD COLUMN IF NOT EXISTS "contact" TEXT;
ALTER TABLE "Plant" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Plant" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Plant" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Plant" ADD COLUMN IF NOT EXISTS "status" "PlantStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Plant" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

UPDATE "Plant"
SET "normalizedName" = LOWER(TRIM(REGEXP_REPLACE("name", '\s+', ' ', 'g')))
WHERE "normalizedName" IS NULL;

-- Resolve pre-existing duplicate plants (same company + normalized name) before unique index.
-- Keep the oldest record; reassign boilers; archive duplicates with a suffixed normalizedName.
WITH ranked_plants AS (
  SELECT
    id,
    "companyId",
    "normalizedName",
    ROW_NUMBER() OVER (
      PARTITION BY "companyId", "normalizedName"
      ORDER BY "createdAt" ASC, id ASC
    ) AS rn
  FROM "Plant"
  WHERE "companyId" IS NOT NULL
    AND "normalizedName" IS NOT NULL
),
duplicate_map AS (
  SELECT
    r.id AS duplicate_id,
    k.id AS keeper_id
  FROM ranked_plants r
  JOIN ranked_plants k
    ON k."companyId" = r."companyId"
   AND k."normalizedName" = r."normalizedName"
   AND k.rn = 1
  WHERE r.rn > 1
)
UPDATE "Boiler" b
SET "plantId" = d.keeper_id
FROM duplicate_map d
WHERE b."plantId" = d.duplicate_id;

WITH ranked_plants AS (
  SELECT
    id,
    "normalizedName",
    ROW_NUMBER() OVER (
      PARTITION BY "companyId", "normalizedName"
      ORDER BY "createdAt" ASC, id ASC
    ) AS rn
  FROM "Plant"
  WHERE "companyId" IS NOT NULL
    AND "normalizedName" IS NOT NULL
)
UPDATE "Plant" p
SET
  "status" = 'DISABLED',
  "deletedAt" = COALESCE(p."deletedAt", NOW()),
  "normalizedName" = p."normalizedName" || '__archived__' || p.id
FROM ranked_plants r
WHERE p.id = r.id
  AND r.rn > 1;

ALTER TABLE "Plant" ALTER COLUMN "normalizedName" SET NOT NULL;
ALTER TABLE "Plant" ALTER COLUMN "client" DROP NOT NULL;

-- Boiler: custom types and pressure fields
ALTER TABLE "Boiler" ADD COLUMN IF NOT EXISTS "customType" TEXT;
ALTER TABLE "Boiler" ADD COLUMN IF NOT EXISTS "customFuelType" TEXT;
ALTER TABLE "Boiler" ADD COLUMN IF NOT EXISTS "designPressureKgCm2" DOUBLE PRECISION;
ALTER TABLE "Boiler" ADD COLUMN IF NOT EXISTS "designPressureNotApplicable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Boiler" ADD COLUMN IF NOT EXISTS "operatingPressureKgCm2" DOUBLE PRECISION;
ALTER TABLE "Boiler" ADD COLUMN IF NOT EXISTS "operatingPressureNotApplicable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Boiler" ADD COLUMN IF NOT EXISTS "operatingTemperatureC" DOUBLE PRECISION;
ALTER TABLE "Boiler" ADD COLUMN IF NOT EXISTS "operatingTemperatureNotApplicable" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Boiler" SET "designPressureKgCm2" = "designPressure" WHERE "designPressureKgCm2" IS NULL AND "designPressure" IS NOT NULL;
UPDATE "Boiler" SET "operatingPressureKgCm2" = "operatingPressure" WHERE "operatingPressureKgCm2" IS NULL AND "operatingPressure" IS NOT NULL;
UPDATE "Boiler" SET "operatingTemperatureC" = "operatingTemperature" WHERE "operatingTemperatureC" IS NULL AND "operatingTemperature" IS NOT NULL;

ALTER TABLE "Boiler" DROP COLUMN IF EXISTS "designPressure";
ALTER TABLE "Boiler" DROP COLUMN IF EXISTS "operatingPressure";
ALTER TABLE "Boiler" DROP COLUMN IF EXISTS "operatingTemperature";

-- Boiler internalId: per-company unique
ALTER TABLE "Boiler" DROP CONSTRAINT IF EXISTS "Boiler_internalId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Boiler_companyId_internalId_key" ON "Boiler"("companyId", "internalId");

-- BoilerOperatingLimit renames
ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "pressureMin" TO "pressureMinKgCm2";
ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "pressureMax" TO "pressureMaxKgCm2";
ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "temperatureMin" TO "temperatureMinC";
ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "temperatureMax" TO "temperatureMaxC";
ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "waterLevelMin" TO "waterLevelMinPercent";
ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "waterLevelMax" TO "waterLevelMaxPercent";
ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "conductivityMax" TO "conductivityMaxUsCm";
ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "tdsMax" TO "tdsMaxPpm";
ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "hardnessMax" TO "hardnessMaxPpm";
ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "o2Min" TO "o2MinPercent";
ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "o2Max" TO "o2MaxPercent";
ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "coMax" TO "coMaxPpm";
ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "flueGasTempMax" TO "stackTemperatureMaxC";

-- BoilerLog field migrations
ALTER TABLE "BoilerLog" ADD COLUMN IF NOT EXISTS "steamPressureKgCm2" DOUBLE PRECISION;
ALTER TABLE "BoilerLog" ADD COLUMN IF NOT EXISTS "steamTemperatureC" DOUBLE PRECISION;
ALTER TABLE "BoilerLog" ADD COLUMN IF NOT EXISTS "feedwaterPressureKgCm2" DOUBLE PRECISION;
ALTER TABLE "BoilerLog" ADD COLUMN IF NOT EXISTS "feedwaterTemperatureC" DOUBLE PRECISION;
ALTER TABLE "BoilerLog" ADD COLUMN IF NOT EXISTS "condensateReturnTemperatureC" DOUBLE PRECISION;
ALTER TABLE "BoilerLog" ADD COLUMN IF NOT EXISTS "waterLevelPercent" DOUBLE PRECISION;
ALTER TABLE "BoilerLog" ADD COLUMN IF NOT EXISTS "feedPumpPressureKgCm2" DOUBLE PRECISION;
ALTER TABLE "BoilerLog" ADD COLUMN IF NOT EXISTS "alternatePumpPressureKgCm2" DOUBLE PRECISION;
ALTER TABLE "BoilerLog" ADD COLUMN IF NOT EXISTS "fuelPressureValue" DOUBLE PRECISION;
ALTER TABLE "BoilerLog" ADD COLUMN IF NOT EXISTS "fuelPressureUnit" "FuelPressureUnit";
ALTER TABLE "BoilerLog" ADD COLUMN IF NOT EXISTS "operatingFuelType" TEXT;
ALTER TABLE "BoilerLog" ADD COLUMN IF NOT EXISTS "fuelConsumptionValue" DOUBLE PRECISION;
ALTER TABLE "BoilerLog" ADD COLUMN IF NOT EXISTS "fuelConsumptionUnit" "FuelConsumptionUnit";
ALTER TABLE "BoilerLog" ADD COLUMN IF NOT EXISTS "fanFrequencyHz" DOUBLE PRECISION;
ALTER TABLE "BoilerLog" ADD COLUMN IF NOT EXISTS "modulationPositionDegrees" DOUBLE PRECISION;

UPDATE "BoilerLog" SET "steamPressureKgCm2" = "steamPressure" WHERE "steamPressureKgCm2" IS NULL AND "steamPressure" IS NOT NULL;
UPDATE "BoilerLog" SET "steamTemperatureC" = "steamTemperature" WHERE "steamTemperatureC" IS NULL AND "steamTemperature" IS NOT NULL;
UPDATE "BoilerLog" SET "feedwaterPressureKgCm2" = "feedwaterPressure" WHERE "feedwaterPressureKgCm2" IS NULL AND "feedwaterPressure" IS NOT NULL;
UPDATE "BoilerLog" SET "feedwaterTemperatureC" = "feedwaterTemperature" WHERE "feedwaterTemperatureC" IS NULL AND "feedwaterTemperature" IS NOT NULL;
UPDATE "BoilerLog" SET "condensateReturnTemperatureC" = "condensateReturnTemp" WHERE "condensateReturnTemperatureC" IS NULL AND "condensateReturnTemp" IS NOT NULL;
UPDATE "BoilerLog" SET "waterLevelPercent" = "waterLevel" WHERE "waterLevelPercent" IS NULL AND "waterLevel" IS NOT NULL;
UPDATE "BoilerLog" SET "fuelPressureValue" = "fuelPressure" WHERE "fuelPressureValue" IS NULL AND "fuelPressure" IS NOT NULL;
UPDATE "BoilerLog" SET "fuelPressureUnit" = 'KG_CM2' WHERE "fuelPressureValue" IS NOT NULL AND "fuelPressureUnit" IS NULL;
UPDATE "BoilerLog" SET "fanFrequencyHz" = "fanFrequency" WHERE "fanFrequencyHz" IS NULL AND "fanFrequency" IS NOT NULL;
UPDATE "BoilerLog" SET "modulationPositionDegrees" = "modulationPosition" WHERE "modulationPositionDegrees" IS NULL AND "modulationPosition" IS NOT NULL;

UPDATE "BoilerLog" bl
SET "fuelConsumptionValue" = c."fuelConsumption", "fuelConsumptionUnit" = 'L'
FROM "BoilerLogCombustion" c
WHERE c."boilerLogId" = bl."id" AND bl."fuelConsumptionValue" IS NULL AND c."fuelConsumption" IS NOT NULL;

ALTER TABLE "BoilerLog" DROP COLUMN IF EXISTS "steamPressure";
ALTER TABLE "BoilerLog" DROP COLUMN IF EXISTS "steamTemperature";
ALTER TABLE "BoilerLog" DROP COLUMN IF EXISTS "feedwaterPressure";
ALTER TABLE "BoilerLog" DROP COLUMN IF EXISTS "feedwaterTemperature";
ALTER TABLE "BoilerLog" DROP COLUMN IF EXISTS "condensateReturnTemp";
ALTER TABLE "BoilerLog" DROP COLUMN IF EXISTS "waterLevel";
ALTER TABLE "BoilerLog" DROP COLUMN IF EXISTS "fuelPressure";
ALTER TABLE "BoilerLog" DROP COLUMN IF EXISTS "fanFrequency";
ALTER TABLE "BoilerLog" DROP COLUMN IF EXISTS "modulationPosition";

-- BoilerLogCombustion renames
ALTER TABLE "BoilerLogCombustion" RENAME COLUMN "flueGasTemperature" TO "flueGasTemperatureC";
ALTER TABLE "BoilerLogCombustion" RENAME COLUMN "o2" TO "o2Percent";
ALTER TABLE "BoilerLogCombustion" RENAME COLUMN "co" TO "coPpm";
ALTER TABLE "BoilerLogCombustion" RENAME COLUMN "co2" TO "co2Percent";
ALTER TABLE "BoilerLogCombustion" RENAME COLUMN "excessAir" TO "excessAirPercent";
ALTER TABLE "BoilerLogCombustion" RENAME COLUMN "estimatedEfficiency" TO "estimatedEfficiencyPercent";
ALTER TABLE "BoilerLogCombustion" RENAME COLUMN "steamFlow" TO "steamFlowKgH";
ALTER TABLE "BoilerLogCombustion" DROP COLUMN IF EXISTS "fuelConsumption";

-- BoilerLogWaterTreatment renames
ALTER TABLE "BoilerLogWaterTreatment" RENAME COLUMN "conductivity" TO "conductivityUsCm";
ALTER TABLE "BoilerLogWaterTreatment" RENAME COLUMN "tds" TO "tdsPpm";
ALTER TABLE "BoilerLogWaterTreatment" ADD COLUMN IF NOT EXISTS "tdsConversionFactor" DOUBLE PRECISION;
ALTER TABLE "BoilerLogWaterTreatment" RENAME COLUMN "hardness" TO "hardnessPpmAsCaCO3";
ALTER TABLE "BoilerLogWaterTreatment" RENAME COLUMN "sulfites" TO "sulfitesPpm";
ALTER TABLE "BoilerLogWaterTreatment" RENAME COLUMN "phosphates" TO "phosphatesPpm";
ALTER TABLE "BoilerLogWaterTreatment" RENAME COLUMN "alkalinity" TO "alkalinityPpmAsCaCO3";
ALTER TABLE "BoilerLogWaterTreatment" RENAME COLUMN "chlorides" TO "chloridesPpm";

-- Plant unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "Plant_companyId_normalizedName_key" ON "Plant"("companyId", "normalizedName");
