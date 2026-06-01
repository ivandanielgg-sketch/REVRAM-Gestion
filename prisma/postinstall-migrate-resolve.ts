import { resolveFailedMigration } from "./migration-recovery";

if (!process.env.DATABASE_URL) {
  console.log("[postinstall-migrate] DATABASE_URL not set, skipping migration recovery.");
  process.exit(0);
}

console.log("[postinstall-migrate] Checking for failed Prisma migrations...");
resolveFailedMigration();
process.exit(0);
