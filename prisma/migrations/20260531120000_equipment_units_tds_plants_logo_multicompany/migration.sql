-- Idempotent migration: safe to re-run after partial failure on production.

-- CreateEnum (skip if already exists from a partial apply)
DO $$ BEGIN CREATE TYPE "PlantStatus" AS ENUM ('ACTIVE', 'DISABLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "FuelPressureUnit" AS ENUM ('IN_H2O', 'KG_CM2');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "FuelConsumptionUnit" AS ENUM ('M3N', 'L', 'KG');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE "BoilerType" ADD VALUE IF NOT EXISTS 'MIXTA';
ALTER TYPE "FuelType" ADD VALUE IF NOT EXISTS 'BIOMASA';

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

ALTER TABLE "Plant" ADD COLUMN IF NOT EXISTS "normalizedName" TEXT;
ALTER TABLE "Plant" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Plant" ADD COLUMN IF NOT EXISTS "contact" TEXT;
ALTER TABLE "Plant" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Plant" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Plant" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Plant" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Plant' AND column_name = 'status'
  ) THEN
    ALTER TABLE "Plant" ADD COLUMN "status" "PlantStatus" NOT NULL DEFAULT 'ACTIVE';
  END IF;
END $$;

UPDATE "Plant"
SET "normalizedName" = LOWER(TRIM(REGEXP_REPLACE("name", '\s+', ' ', 'g')))
WHERE "normalizedName" IS NULL;

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
    AND strpos("normalizedName", '__archived__') = 0
),
duplicate_map AS (
  SELECT r.id AS duplicate_id, k.id AS keeper_id
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
    AND strpos("normalizedName", '__archived__') = 0
)
UPDATE "Plant" p
SET
  "status" = 'DISABLED',
  "deletedAt" = COALESCE(p."deletedAt", NOW()),
  "normalizedName" = p."normalizedName" || '__archived__' || p.id
FROM ranked_plants r
WHERE p.id = r.id AND r.rn > 1;

ALTER TABLE "Plant" ALTER COLUMN "normalizedName" SET NOT NULL;
ALTER TABLE "Plant" ALTER COLUMN "client" DROP NOT NULL;

ALTER TABLE "Boiler" ADD COLUMN IF NOT EXISTS "customType" TEXT;
ALTER TABLE "Boiler" ADD COLUMN IF NOT EXISTS "customFuelType" TEXT;
ALTER TABLE "Boiler" ADD COLUMN IF NOT EXISTS "designPressureKgCm2" DOUBLE PRECISION;
ALTER TABLE "Boiler" ADD COLUMN IF NOT EXISTS "designPressureNotApplicable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Boiler" ADD COLUMN IF NOT EXISTS "operatingPressureKgCm2" DOUBLE PRECISION;
ALTER TABLE "Boiler" ADD COLUMN IF NOT EXISTS "operatingPressureNotApplicable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Boiler" ADD COLUMN IF NOT EXISTS "operatingTemperatureC" DOUBLE PRECISION;
ALTER TABLE "Boiler" ADD COLUMN IF NOT EXISTS "operatingTemperatureNotApplicable" BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Boiler' AND column_name = 'designPressure'
  ) THEN
    UPDATE "Boiler" SET "designPressureKgCm2" = "designPressure"
    WHERE "designPressureKgCm2" IS NULL AND "designPressure" IS NOT NULL;
    ALTER TABLE "Boiler" DROP COLUMN "designPressure";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Boiler' AND column_name = 'operatingPressure'
  ) THEN
    UPDATE "Boiler" SET "operatingPressureKgCm2" = "operatingPressure"
    WHERE "operatingPressureKgCm2" IS NULL AND "operatingPressure" IS NOT NULL;
    ALTER TABLE "Boiler" DROP COLUMN "operatingPressure";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Boiler' AND column_name = 'operatingTemperature'
  ) THEN
    UPDATE "Boiler" SET "operatingTemperatureC" = "operatingTemperature"
    WHERE "operatingTemperatureC" IS NULL AND "operatingTemperature" IS NOT NULL;
    ALTER TABLE "Boiler" DROP COLUMN "operatingTemperature";
  END IF;
END $$;

ALTER TABLE "Boiler" DROP CONSTRAINT IF EXISTS "Boiler_internalId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Boiler_companyId_internalId_key" ON "Boiler"("companyId", "internalId");

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerOperatingLimit' AND column_name='pressureMin') THEN
    ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "pressureMin" TO "pressureMinKgCm2";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerOperatingLimit' AND column_name='pressureMax') THEN
    ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "pressureMax" TO "pressureMaxKgCm2";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerOperatingLimit' AND column_name='temperatureMin') THEN
    ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "temperatureMin" TO "temperatureMinC";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerOperatingLimit' AND column_name='temperatureMax') THEN
    ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "temperatureMax" TO "temperatureMaxC";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerOperatingLimit' AND column_name='waterLevelMin') THEN
    ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "waterLevelMin" TO "waterLevelMinPercent";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerOperatingLimit' AND column_name='waterLevelMax') THEN
    ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "waterLevelMax" TO "waterLevelMaxPercent";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerOperatingLimit' AND column_name='conductivityMax') THEN
    ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "conductivityMax" TO "conductivityMaxUsCm";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerOperatingLimit' AND column_name='tdsMax') THEN
    ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "tdsMax" TO "tdsMaxPpm";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerOperatingLimit' AND column_name='hardnessMax') THEN
    ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "hardnessMax" TO "hardnessMaxPpm";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerOperatingLimit' AND column_name='o2Min') THEN
    ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "o2Min" TO "o2MinPercent";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerOperatingLimit' AND column_name='o2Max') THEN
    ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "o2Max" TO "o2MaxPercent";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerOperatingLimit' AND column_name='coMax') THEN
    ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "coMax" TO "coMaxPpm";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerOperatingLimit' AND column_name='flueGasTempMax') THEN
    ALTER TABLE "BoilerOperatingLimit" RENAME COLUMN "flueGasTempMax" TO "stackTemperatureMaxC";
  END IF;
END $$;

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

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLog' AND column_name='steamPressure') THEN
    UPDATE "BoilerLog" SET "steamPressureKgCm2" = "steamPressure" WHERE "steamPressureKgCm2" IS NULL AND "steamPressure" IS NOT NULL;
    ALTER TABLE "BoilerLog" DROP COLUMN "steamPressure";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLog' AND column_name='steamTemperature') THEN
    UPDATE "BoilerLog" SET "steamTemperatureC" = "steamTemperature" WHERE "steamTemperatureC" IS NULL AND "steamTemperature" IS NOT NULL;
    ALTER TABLE "BoilerLog" DROP COLUMN "steamTemperature";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLog' AND column_name='feedwaterPressure') THEN
    UPDATE "BoilerLog" SET "feedwaterPressureKgCm2" = "feedwaterPressure" WHERE "feedwaterPressureKgCm2" IS NULL AND "feedwaterPressure" IS NOT NULL;
    ALTER TABLE "BoilerLog" DROP COLUMN "feedwaterPressure";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLog' AND column_name='feedwaterTemperature') THEN
    UPDATE "BoilerLog" SET "feedwaterTemperatureC" = "feedwaterTemperature" WHERE "feedwaterTemperatureC" IS NULL AND "feedwaterTemperature" IS NOT NULL;
    ALTER TABLE "BoilerLog" DROP COLUMN "feedwaterTemperature";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLog' AND column_name='condensateReturnTemp') THEN
    UPDATE "BoilerLog" SET "condensateReturnTemperatureC" = "condensateReturnTemp" WHERE "condensateReturnTemperatureC" IS NULL AND "condensateReturnTemp" IS NOT NULL;
    ALTER TABLE "BoilerLog" DROP COLUMN "condensateReturnTemp";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLog' AND column_name='waterLevel') THEN
    UPDATE "BoilerLog" SET "waterLevelPercent" = "waterLevel" WHERE "waterLevelPercent" IS NULL AND "waterLevel" IS NOT NULL;
    ALTER TABLE "BoilerLog" DROP COLUMN "waterLevel";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLog' AND column_name='fuelPressure') THEN
    UPDATE "BoilerLog" SET "fuelPressureValue" = "fuelPressure" WHERE "fuelPressureValue" IS NULL AND "fuelPressure" IS NOT NULL;
    ALTER TABLE "BoilerLog" DROP COLUMN "fuelPressure";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLog' AND column_name='fanFrequency') THEN
    UPDATE "BoilerLog" SET "fanFrequencyHz" = "fanFrequency" WHERE "fanFrequencyHz" IS NULL AND "fanFrequency" IS NOT NULL;
    ALTER TABLE "BoilerLog" DROP COLUMN "fanFrequency";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLog' AND column_name='modulationPosition') THEN
    UPDATE "BoilerLog" SET "modulationPositionDegrees" = "modulationPosition" WHERE "modulationPositionDegrees" IS NULL AND "modulationPosition" IS NOT NULL;
    ALTER TABLE "BoilerLog" DROP COLUMN "modulationPosition";
  END IF;
END $$;

UPDATE "BoilerLog" SET "fuelPressureUnit" = 'KG_CM2' WHERE "fuelPressureValue" IS NOT NULL AND "fuelPressureUnit" IS NULL;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='BoilerLogCombustion' AND column_name='fuelConsumption'
  ) THEN
    UPDATE "BoilerLog" bl
    SET "fuelConsumptionValue" = c."fuelConsumption", "fuelConsumptionUnit" = 'L'
    FROM "BoilerLogCombustion" c
    WHERE c."boilerLogId" = bl."id" AND bl."fuelConsumptionValue" IS NULL AND c."fuelConsumption" IS NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLogCombustion' AND column_name='flueGasTemperature') THEN
    ALTER TABLE "BoilerLogCombustion" RENAME COLUMN "flueGasTemperature" TO "flueGasTemperatureC";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLogCombustion' AND column_name='o2') THEN
    ALTER TABLE "BoilerLogCombustion" RENAME COLUMN "o2" TO "o2Percent";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLogCombustion' AND column_name='co') THEN
    ALTER TABLE "BoilerLogCombustion" RENAME COLUMN "co" TO "coPpm";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLogCombustion' AND column_name='co2') THEN
    ALTER TABLE "BoilerLogCombustion" RENAME COLUMN "co2" TO "co2Percent";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLogCombustion' AND column_name='excessAir') THEN
    ALTER TABLE "BoilerLogCombustion" RENAME COLUMN "excessAir" TO "excessAirPercent";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLogCombustion' AND column_name='estimatedEfficiency') THEN
    ALTER TABLE "BoilerLogCombustion" RENAME COLUMN "estimatedEfficiency" TO "estimatedEfficiencyPercent";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLogCombustion' AND column_name='steamFlow') THEN
    ALTER TABLE "BoilerLogCombustion" RENAME COLUMN "steamFlow" TO "steamFlowKgH";
  END IF;
END $$;

ALTER TABLE "BoilerLogCombustion" DROP COLUMN IF EXISTS "fuelConsumption";

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLogWaterTreatment' AND column_name='conductivity') THEN
    ALTER TABLE "BoilerLogWaterTreatment" RENAME COLUMN "conductivity" TO "conductivityUsCm";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLogWaterTreatment' AND column_name='tds') THEN
    ALTER TABLE "BoilerLogWaterTreatment" RENAME COLUMN "tds" TO "tdsPpm";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLogWaterTreatment' AND column_name='hardness') THEN
    ALTER TABLE "BoilerLogWaterTreatment" RENAME COLUMN "hardness" TO "hardnessPpmAsCaCO3";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLogWaterTreatment' AND column_name='sulfites') THEN
    ALTER TABLE "BoilerLogWaterTreatment" RENAME COLUMN "sulfites" TO "sulfitesPpm";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLogWaterTreatment' AND column_name='phosphates') THEN
    ALTER TABLE "BoilerLogWaterTreatment" RENAME COLUMN "phosphates" TO "phosphatesPpm";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLogWaterTreatment' AND column_name='alkalinity') THEN
    ALTER TABLE "BoilerLogWaterTreatment" RENAME COLUMN "alkalinity" TO "alkalinityPpmAsCaCO3";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BoilerLogWaterTreatment' AND column_name='chlorides') THEN
    ALTER TABLE "BoilerLogWaterTreatment" RENAME COLUMN "chlorides" TO "chloridesPpm";
  END IF;
END $$;

ALTER TABLE "BoilerLogWaterTreatment" ADD COLUMN IF NOT EXISTS "tdsConversionFactor" DOUBLE PRECISION;

CREATE UNIQUE INDEX IF NOT EXISTS "Plant_companyId_normalizedName_key" ON "Plant"("companyId", "normalizedName");
