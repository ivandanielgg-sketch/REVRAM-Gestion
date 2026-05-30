-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'DISABLED', 'DELETED');
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'DISABLED', 'DELETED');

-- CreateTable Company
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- Insert default REVRAM company
INSERT INTO "Company" ("id", "name", "status", "createdAt", "updatedAt")
VALUES ('revram-company-001', 'REVRAM', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Add columns to User before enum migration
ALTER TABLE "User" ADD COLUMN "name" TEXT;
UPDATE "User" SET "name" = "username";
ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;

ALTER TABLE "User" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';
UPDATE "User" SET "status" = CASE WHEN "isActive" = true THEN 'ACTIVE'::"UserStatus" ELSE 'DISABLED'::"UserStatus" END;

ALTER TABLE "User" ADD COLUMN "companyId" TEXT;
ALTER TABLE "User" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Assign existing users to REVRAM company
UPDATE "User" SET "companyId" = 'revram-company-001';

-- Migrate UserRole enum
CREATE TYPE "UserRole_new" AS ENUM ('SUPER_ADMIN', 'COMPANY_ADMIN', 'SUPERVISOR', 'OPERATOR', 'MAINTENANCE', 'VIEWER');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING (
  CASE "role"::text
    WHEN 'ADMINISTRADOR' THEN 'SUPER_ADMIN'
    WHEN 'SUPERVISOR' THEN 'SUPERVISOR'
    WHEN 'OPERADOR' THEN 'OPERATOR'
    WHEN 'MANTENIMIENTO' THEN 'MAINTENANCE'
    WHEN 'SOLO_CONSULTA' THEN 'VIEWER'
    ELSE 'OPERATOR'
  END::"UserRole_new"
);

DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'OPERATOR';

ALTER TABLE "User" DROP COLUMN "isActive";

-- Add companyId to Plant and Boiler
ALTER TABLE "Plant" ADD COLUMN "companyId" TEXT;
UPDATE "Plant" SET "companyId" = 'revram-company-001';

ALTER TABLE "Boiler" ADD COLUMN "companyId" TEXT;
UPDATE "Boiler" SET "companyId" = 'revram-company-001';

-- PasswordResetToken: migrate to tokenHash + usedAt
ALTER TABLE "PasswordResetToken" ADD COLUMN "tokenHash" TEXT;
ALTER TABLE "PasswordResetToken" ADD COLUMN "usedAt" TIMESTAMP(3);

UPDATE "PasswordResetToken" SET "tokenHash" = "token" WHERE "token" IS NOT NULL;
UPDATE "PasswordResetToken" SET "usedAt" = CURRENT_TIMESTAMP WHERE "used" = true;

ALTER TABLE "PasswordResetToken" ALTER COLUMN "tokenHash" SET NOT NULL;
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT IF EXISTS "PasswordResetToken_token_key";
ALTER TABLE "PasswordResetToken" DROP COLUMN "token";
ALTER TABLE "PasswordResetToken" DROP COLUMN "used";

-- Update admin email
UPDATE "User" SET "email" = 'admin@revram.mx', "name" = 'Administrador REVRAM' WHERE "username" = 'admin';

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "Boiler_companyId_idx" ON "Boiler"("companyId");
CREATE INDEX "PasswordResetToken_tokenHash_idx" ON "PasswordResetToken"("tokenHash");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Plant" ADD CONSTRAINT "Plant_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Boiler" ADD CONSTRAINT "Boiler_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
